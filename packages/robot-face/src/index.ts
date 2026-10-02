/**
 * @amoji/robot-face — Amoji Robot Face SDK
 * Plug-and-use emotion display for humanoid robots.
 *
 *   import { AmojiFace, HttpDriver } from '@amoji/robot-face';
 *   const face = new AmojiFace({ driver: new HttpDriver('http://ROBOT_IP:8080/api/face') });
 *   face.start();
 *   face.say('你好！');           // text → emotion analysis → face + speech hook
 *   face.setEmotion('joy', 1);   // or drive directly from your robot stack
 *
 * Two display paths:
 *  1. Monitor / phone display  → pass a <canvas> element.
 *  2. LED matrix face (Unitree-style) → the driver receives a size×size×3 RGB
 *     buffer every frame via showFrame(). Bridge it to your LED hardware
 *     (WS2812, Unitree face service, serial, ROS topic…).
 */

export interface FaceParams {
  eyeW: number; eyeH: number; pupil: number;
  smile: number; open: number;
  r: number; g: number; b: number;
  bounce: number;
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

export function paramsForEmotion(emotion: string, intensity = 1): FaceParams {
  const e = EMOTION_PARAMS[emotion] ?? {};
  const k = Math.min(1, Math.max(0, intensity));
  const p = { ...NEUTRAL };
  return {
    eyeW: p.eyeW, pupil: p.pupil,
    eyeH: p.eyeH + ((e.eyeH ?? p.eyeH) - p.eyeH) * k,
    smile: p.smile + ((e.smile ?? p.smile) - p.smile) * k,
    open: p.open + ((e.open ?? p.open) - p.open) * k,
    r: Math.round(p.r + ((e.r ?? p.r) - p.r) * k),
    g: Math.round(p.g + ((e.g ?? p.g) - p.g) * k),
    b: Math.round(p.b + ((e.b ?? p.b) - p.b) * k),
    bounce: p.bounce + ((e.bounce ?? p.bounce) - p.bounce) * k,
  };
}

/** Minimal built-in text→emotion so the SDK has zero dependencies. */
export function analyzeText(text: string): Record<string, number> {
  const t = text.toLowerCase();
  const score = (words: string[]): number => {
    let s = 0;
    for (const w of words) if (t.includes(w)) s += 1;
    return Math.min(1, s * 0.7);
  };
  const out: Record<string, number> = {};
  const map: Array<[string, string[]]> = [
    ['joy', ['happy', 'great', '開心', '高兴', '好開心', '開心', '好開心', 'yay', 'love it', '好正', '正呀']],
    ['excitement', ['wow', 'amazing', 'awesome', '好興奮', '兴奋', '劲', '太棒', 'crazy']],
    ['love', ['love you', '鍾意你', '喜欢你', '好鍾意', '親', 'hug', '抱抱']],
    ['sadness', ['sad', '唔開心', '不開心', '难过', '難過', 'cry', '喊', 'lonely', '寂寞', '攰', '累', 'tired']],
    ['anger', ['angry', '嬲', '生气', '生氣', 'hate', '讨厌', '煩', 'mad']],
    ['fear', ['scared', 'afraid', '怕', '驚', '惊', '恐怖', 'worried', '擔心', '担心']],
    ['surprise', ['what?!', '真的', '真係', 'omg', '竟然', 'surprise', '居然']],
  ];
  for (const [emo, words] of map) {
    const s = score(words);
    if (s > 0) out[emo] = s;
  }
  return out;
}

export function paramsForText(text: string): FaceParams {
  const hints = analyzeText(text);
  const top = Object.entries(hints).sort((a, b) => b[1] - a[1])[0];
  return top ? paramsForEmotion(top[0], top[1]) : { ...NEUTRAL };
}

export const LED_SIZE = 16;

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

export interface FaceDriver {
  showFrame?(frame: Uint8Array, size: number): void;
  speak?(text: string): void;
}

/** POST each frame as JSON to your robot bridge (Unitree face service, ESP32, etc.). */
export class HttpDriver implements FaceDriver {
  constructor(private url: string, private fps = 15) {}
  private last = 0;
  async showFrame(frame: Uint8Array, size: number): Promise<void> {
    const now = Date.now();
    if (now - this.last < 1000 / this.fps) return;
    this.last = now;
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size, frame: Array.from(frame) }),
      });
    } catch { /* robot offline — keep animating locally */ }
  }
}

/** Unitree Robotics — bridges to the built-in face LED service. */
export class UnitreeDriver extends HttpDriver {
  constructor(robotIp: string, port = 8080) {
    super(`http://${robotIp}:${port}/api/face`);
  }
}

export interface AmojiFaceOptions {
  canvas?: HTMLCanvasElement | null;
  driver?: FaceDriver;
  ledSize?: number;
  holdMs?: number;
}

export class AmojiFace {
  private target: FaceParams = { ...NEUTRAL };
  private cur: FaceParams = { ...NEUTRAL };
  private raf = 0;
  private t0 = 0;
  private holdUntil = 0;

  constructor(private opts: AmojiFaceOptions = {}) {}

  get current(): FaceParams {
    return this.cur;
  }

  start(): void {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return;
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
      const canvas = this.opts.canvas;
      if (canvas) drawFace(canvas, this.cur, t);
      this.opts.driver?.showFrame?.(ledFrame(this.cur, t, this.opts.ledSize ?? LED_SIZE), this.opts.ledSize ?? LED_SIZE);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  say(text: string): void {
    this.target = paramsForText(text);
    this.holdUntil = performance.now() + (this.opts.holdMs ?? 4000);
    this.opts.driver?.speak?.(text);
  }

  setEmotion(emotion: string, intensity = 1): void {
    this.target = paramsForEmotion(emotion, intensity);
    this.holdUntil = performance.now() + (this.opts.holdMs ?? 4000);
  }
}

function drawFace(canvas: HTMLCanvasElement, p: FaceParams, t: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const bob = Math.sin(t * 2.2) * h * 0.02 * p.bounce;
  const color = `rgb(${p.r},${p.g},${p.b})`;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.min(w, h) * 0.08;
  const ew = w * 0.13 * p.eyeW;
  const eh = Math.max(2, h * 0.13 * p.eyeH);
  const ex = w * 0.19;
  const ey = cy - h * 0.06 + bob;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(cx + side * ex - ew / 2, ey - eh / 2, ew, eh, Math.min(ew, eh) / 2);
    else ctx.rect(cx + side * ex - ew / 2, ey - eh / 2, ew, eh);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
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
