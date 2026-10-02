'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Amoji Robot Face — B2B emotion display engine.
// Text / emotion in → animated face frames out. Renders to any monitor canvas
// or to an RGB LED-matrix frame buffer (Unitree-style face). Plug-and-use.
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

// ── canvas rendering (monitor / phone displays) ─────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawFace(ctx: CanvasRenderingContext2D, w: number, h: number, p: FaceParams, t: number, blink: number): void {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const bob = Math.sin(t * 2.2) * h * 0.02 * p.bounce;
  const color = `rgb(${p.r},${p.g},${p.b})`;
  const eyeH = Math.max(0.04, p.eyeH * (1 - blink));
  const ex = w * 0.19;
  const ey = cy - h * 0.06 + bob;
  const ew = w * 0.13 * p.eyeW;
  const eh = Math.max(2, h * 0.13 * eyeH);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.min(w, h) * 0.08;
  rr(ctx, cx - ex - ew / 2, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2);
  ctx.fill();
  rr(ctx, cx + ex - ew / 2, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // mouth — quadratic curve, smile lifts the middle up
  const mw = w * 0.2;
  const my = cy + h * 0.15 + bob;
  const lift = Math.abs(p.smile) * h * 0.045;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + p.open * h * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - mw, my);
  ctx.quadraticCurveTo(cx, my + (p.smile >= 0 ? lift * 2 : -lift * 2), cx + mw, my);
  ctx.stroke();
  if (p.open > 0.35) {
    ctx.beginPath();
    ctx.ellipse(cx, my + lift, mw * 0.35, h * 0.03 * p.open, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── LED matrix frame buffer (Unitree-style face) ────────────────────────────

export const LED_SIZE = 16;

/** Render face params to an RGB byte buffer (size×size×3), top-left origin. */
export function ledFrame(p: FaceParams, t: number, size = LED_SIZE): Uint8Array {
  const buf = new Uint8Array(size * size * 3);
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
  };
  const bobY = Math.round(Math.sin(t * 2.2) * p.bounce);
  const cy = Math.floor(size / 2) + bobY;
  const eyeRows = Math.max(1, Math.round(3 * p.eyeH));
  const eyeY = cy - 3;
  for (let y = 0; y < eyeRows; y++) {
    for (let x = 3; x <= 5; x++) set(x, eyeY + y, p.r, p.g, p.b);
    for (let x = 10; x <= 12; x++) set(x, eyeY + y, p.r, p.g, p.b);
  }
  // mouth
  const mY = cy + 4;
  const half = 4;
  for (let x = -half; x <= half; x++) {
    const curve = Math.round(p.smile * (1 - Math.abs(x) / (half + 1)) * -2);
    const y = mY + (p.smile >= 0 ? curve : -curve);
    set(Math.floor(size / 2) + x, y, p.r, p.g, p.b);
    if (p.open > 0.45 && Math.abs(x) < half - 1) set(Math.floor(size / 2) + x, y + 1, p.r, p.g, p.b);
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

  constructor(private opts: AmojiFaceOptions = {}) {}

  get current(): FaceParams {
    return this.cur;
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
      // blink
      this.nextBlink -= 1 / 60;
      if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = 2 + Math.random() * 3; }
      this.blink = Math.max(0, this.blink - 0.09);
      const canvas = this.opts.canvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawFace(ctx, canvas.width, canvas.height, this.cur, t, this.blink * this.blink);
      }
      this.opts.driver?.showFrame?.(ledFrame(this.cur, t, this.opts.ledSize ?? LED_SIZE), this.opts.ledSize ?? LED_SIZE);
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
