'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Amoji Robot Face — B2B emotion display engine.
// Text / emotion in → animated face frames out. Renders to any monitor canvas
// or to an RGB LED-matrix frame buffer (Unitree-style face). Plug-and-use.
//
// v2 additions:
//  • look direction (lookX/lookY −1..1) — eyes follow pointer, faces, sounds
//  • voice level lipsync — mouth opens with real audio amplitude while speaking
//  • showHints() — drive the face straight from LLM emotion hints
// ─────────────────────────────────────────────────────────────────────────────
import { analyzeText } from '@amoji/emotion-core';
import type { EmotionId } from '@amoji/emotion-core';

export interface FaceParams {
  eyeW: number;   // eye width scale
  eyeH: number;   // eye openness 0..1.2
  pupil: number;  // pupil dilation 0..1
  smile: number;  // mouth curve -1 .. 1
  open: number;   // mouth openness 0..1
  r: number; g: number; b: number; // glow color
  bounce: number; // idle bob amplitude 0..1
}

export const NEUTRAL: FaceParams = {
  eyeW: 1, eyeH: 0.8, pupil: 0.5, smile: 0.15, open: 0.1,
  r: 140, g: 220, b: 220, bounce: 0.12,
};

const EMOTION_PARAMS: Record<string, Partial<FaceParams>> = {
  joy:         { eyeH: 1.0, smile: 1, open: 0.3, r: 255, g: 200, b: 80, bounce: 0.4 },
  excitement:  { eyeH: 1.1, smile: 1, open: 0.7, r: 255, g: 170, b: 60, bounce: 0.9 },
  love:        { eyeH: 0.75, smile: 0.9, open: 0.2, r: 255, g: 120, b: 170, bounce: 0.3 },
  contentment: { eyeH: 0.7, smile: 0.6, open: 0.1, r: 120, g: 220, b: 160, bounce: 0.1 },
  pride:       { eyeH: 0.85, smile: 0.8, open: 0.25, r: 255, g: 210, b: 90, bounce: 0.5 },
  surprise:    { eyeH: 1.2, smile: 0.2, open: 0.8, r: 120, g: 220, b: 255, bounce: 0.5 },
  confusion:   { eyeH: 0.9, smile: -0.1, open: 0.2, r: 170, g: 170, b: 255, bounce: 0.15 },
  sadness:     { eyeH: 0.45, smile: -0.6, open: 0.1, r: 90, g: 140, b: 255, bounce: 0 },
  anger:       { eyeH: 0.5, smile: -0.9, open: 0.3, r: 255, g: 80, b: 70, bounce: 0.2 },
  fear:        { eyeH: 1.1, smile: -0.3, open: 0.5, r: 170, g: 120, b: 255, bounce: 0.6 },
  neutral:     {},
};

export function paramsForHints(hints: Partial<Record<EmotionId, number>>): FaceParams {
  const entries = Object.entries(hints).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3);
  let p: FaceParams = { ...NEUTRAL };
  for (const [id, wRaw] of entries) {
    const e = EMOTION_PARAMS[id];
    if (!e) continue;
    const k = Math.min(1, Math.max(0, wRaw ?? 0));
    p = {
      eyeW: p.eyeW,
      pupil: p.pupil,
      eyeH: p.eyeH + ((e.eyeH ?? p.eyeH) - p.eyeH) * k,
      smile: p.smile + ((e.smile ?? p.smile) - p.smile) * k,
      open: p.open + ((e.open ?? p.open) - p.open) * k,
      r: Math.round(p.r + ((e.r ?? p.r) - p.r) * k),
      g: Math.round(p.g + ((e.g ?? p.g) - p.g) * k),
      b: Math.round(p.b + ((e.b ?? p.b) - p.b) * k),
      bounce: p.bounce + ((e.bounce ?? p.bounce) - p.bounce) * k,
    };
  }
  return p;
}

export function paramsForText(text: string): FaceParams {
  return paramsForHints(analyzeText(text));
}

// ── live modifiers (look direction + voice lipsync) ─────────────────────────

export interface FaceModifiers {
  /** horizontal gaze −1 (left) .. 1 (right) */
  lookX?: number;
  /** vertical gaze −1 (up) .. 1 (down) */
  lookY?: number;
  /** voice amplitude 0..1 — opens the mouth for real lipsync */
  level?: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Pure: fold live modifiers into render params. Voice level opens the mouth
 * (never closes it below the emotion's own openness) and dilates the pupil
 * slightly — eyes widen a touch while talking.
 */
export function withLookAndVoice(p: FaceParams, m: FaceModifiers = {}): FaceParams {
  const level = clamp(m.level ?? 0, 0, 1);
  return {
    ...p,
    open: Math.max(p.open, level * 0.95),
    pupil: clamp(p.pupil + level * 0.25, 0, 1),
  };
}

// ── canvas rendering (monitor / phone displays) ─────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawFace(
  ctx: CanvasRenderingContext2D, w: number, h: number, p: FaceParams,
  t: number, blink: number, lookX = 0, lookY = 0, level = 0,
): void {
  const rp = withLookAndVoice(p, { level });
  const lx = clamp(lookX, -1, 1) * w * 0.022;
  const ly = clamp(lookY, -1, 1) * h * 0.016;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const bob = Math.sin(t * 2.2) * h * 0.02 * rp.bounce;
  const color = `rgb(${rp.r},${rp.g},${rp.b})`;
  const eyeH = Math.max(0.04, rp.eyeH * (1 - blink));
  const ex = w * 0.19;
  const ey = cy - h * 0.06 + bob + ly;
  const ew = w * 0.13 * rp.eyeW;
  const eh = Math.max(2, h * 0.13 * eyeH);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.min(w, h) * 0.08;
  rr(ctx, cx - ex - ew / 2 + lx, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2);
  ctx.fill();
  rr(ctx, cx + ex - ew / 2 + lx, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // pupils — bright cores that slide with gaze direction
  const pr = Math.max(1.5, Math.min(ew, eh) * 0.22 * (0.6 + rp.pupil * 0.8));
  const px = lx * 1.6;
  const py = ly * 1.6;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(cx - ex + lx + px * 0.4, ey + py * 0.4, pr, 0, Math.PI * 2);
  ctx.arc(cx + ex + lx + px * 0.4, ey + py * 0.4, pr, 0, Math.PI * 2);
  ctx.fill();
  // mouth — quadratic curve, smile lifts the middle up
  const mw = w * 0.2;
  const my = cy + h * 0.15 + bob;
  const lift = Math.abs(rp.smile) * h * 0.045;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + rp.open * h * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - mw, my);
  ctx.quadraticCurveTo(cx, my + (rp.smile >= 0 ? lift * 2 : -lift * 2), cx + mw, my);
  ctx.stroke();
  if (rp.open > 0.35) {
    ctx.beginPath();
    ctx.ellipse(cx, my + lift, mw * 0.35, h * 0.03 * rp.open, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── LED matrix frame buffer (Unitree-style face) ────────────────────────────

export const LED_SIZE = 16;

/** Render face params to an RGB byte buffer (size×size×3), top-left origin. */
export function ledFrame(p: FaceParams, t: number, size = LED_SIZE, lookX = 0, lookY = 0, level = 0): Uint8Array {
  const rp = withLookAndVoice(p, { level });
  const buf = new Uint8Array(size * size * 3);
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
  };
  const bobY = Math.round(Math.sin(t * 2.2) * rp.bounce);
  const lookXi = Math.round(clamp(lookX, -1, 1) * 1.5);
  const lookYi = Math.round(clamp(lookY, -1, 1) * 1);
  const cy = Math.floor(size / 2) + bobY;
  const eyeRows = Math.max(1, Math.round(3 * rp.eyeH));
  const eyeY = cy - 3 + lookYi;
  for (let y = 0; y < eyeRows; y++) {
    for (let x = 3; x <= 5; x++) set(x + lookXi, eyeY + y, rp.r, rp.g, rp.b);
    for (let x = 10; x <= 12; x++) set(x + lookXi, eyeY + y, rp.r, rp.g, rp.b);
  }
  // mouth
  const mY = cy + 4;
  const half = 4;
  for (let x = -half; x <= half; x++) {
    const curve = Math.round(rp.smile * (1 - Math.abs(x) / (half + 1)) * -2);
    const y = mY + (rp.smile >= 0 ? curve : -curve);
    set(Math.floor(size / 2) + x, y, rp.r, rp.g, rp.b);
    if (rp.open > 0.45 && Math.abs(x) < half - 1) set(Math.floor(size / 2) + x, y + 1, rp.r, rp.g, rp.b);
  }
  return buf;
}

// ── plug-and-use face engine ────────────────────────────────────────────────

export interface FaceDriver {
  /** receives every LED frame — bridge it to your LED hardware (WS2812, Unitree face service, serial, ROS) */
  showFrame?(frame: Uint8Array, size: number): void;
  /** hook your robot TTS here (optional) */
  speak?(text: string): void;
}

export interface AmojiFaceOptions {
  canvas?: HTMLCanvasElement | null;
  driver?: FaceDriver;
  ledSize?: number;
  holdMs?: number; // how long an expressed emotion holds before easing back
}

export class AmojiFace {
  private target: FaceParams = { ...NEUTRAL };
  private cur: FaceParams = { ...NEUTRAL };
  private raf = 0;
  private t0 = 0;
  private blink = 0;
  private nextBlink = 2.5;
  private holdUntil = 0;
  private lookX = 0;
  private lookY = 0;
  private level = 0;

  constructor(private opts: AmojiFaceOptions = {}) {}

  get current(): FaceParams {
    return this.cur;
  }

  /** Eyes glide toward a gaze point, −1..1 on both axes. Call with (0,0) to recenter. */
  setLook(x: number, y: number): void {
    this.lookX = clamp(x, -1, 1);
    this.lookY = clamp(y, -1, 1);
  }

  /** Feed live voice amplitude (0..1) for lipsync; auto-decays if you stop feeding. */
  setVoiceLevel(v: number): void {
    this.level = clamp(v, 0, 1);
  }

  /** Drive the face straight from LLM emotion hints (dominant-blended). */
  showHints(hints: Partial<Record<EmotionId, number>>, holdMs?: number): void {
    if (!hints || !Object.keys(hints).length) return;
    this.target = paramsForHints(hints);
    this.holdUntil = performance.now() + (holdMs ?? this.opts.holdMs ?? 4000);
  }

  start(): void {
    if (this.raf) return;
    this.t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - this.t0) / 1000;
      if (now > this.holdUntil) this.target = { ...NEUTRAL };
      const k = 0.12;
      for (const key of ['eyeW', 'eyeH', 'pupil', 'smile', 'open', 'bounce'] as const) {
        this.cur[key] += (this.target[key] - this.cur[key]) * k;
      }
      this.cur.r += (this.target.r - this.cur.r) * k;
      this.cur.g += (this.target.g - this.cur.g) * k;
      this.cur.b += (this.target.b - this.cur.b) * k;
      // voice level decay — safe if the caller stops feeding samples
      this.level *= 0.9;
      // blink
      this.nextBlink -= 1 / 60;
      if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = 2 + Math.random() * 3; }
      this.blink = Math.max(0, this.blink - 0.09);
      const canvas = this.opts.canvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawFace(ctx, canvas.width, canvas.height, this.cur, t, this.blink * this.blink, this.lookX, this.lookY, this.level);
      }
      this.opts.driver?.showFrame?.(ledFrame(this.cur, t, this.opts.ledSize ?? LED_SIZE, this.lookX, this.lookY, this.level), this.opts.ledSize ?? LED_SIZE);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Analyze text, show the matching expression, and (optionally) speak it. */
  say(text: string): void {
    this.target = paramsForText(text);
    this.holdUntil = performance.now() + (this.opts.holdMs ?? 4000);
    this.opts.driver?.speak?.(text);
  }

  /** Directly drive an emotion: 'joy' | 'sadness' | 'anger' | ... */
  setEmotion(emotion: string, intensity = 1): void {
    this.target = paramsForHints({ [emotion]: intensity } as Partial<Record<EmotionId, number>>);
    this.holdUntil = performance.now() + (this.opts.holdMs ?? 4000);
  }
}
