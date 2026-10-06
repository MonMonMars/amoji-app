import { CATALOG } from './catalog.js';
import { validateEmotionConfig } from './config.js';
import { createRng } from './rng.js';
import { createSaccadeClock } from './saccade.js';
import { EMOTION_IDS, FACE_PARAM_NAMES, BODY_PARAM_NAMES } from './schema.js';
import type { EmotionConfig, EmotionFrame, EmotionId, EmotionInput } from './schema.js';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp11 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

export class EmotionEngine {
  private cfg: EmotionConfig;
  private activation = new Map<EmotionId, number>();
  private current: EmotionFrame;
  private rng: () => number;
  private saccade: ReturnType<typeof createSaccadeClock>;
  private t = 0;
  private lastInputAt = 0;

  constructor(config: Partial<EmotionConfig> = {}, seed = 1) {
    this.cfg = validateEmotionConfig(config);
    this.rng = createRng(seed);
    this.saccade = createSaccadeClock(
      { minMs: this.cfg.saccadeMinMs, maxMs: this.cfg.saccadeMaxMs },
      this.rng,
    );
    this.current = this.blankFrame();
  }

  private blankFrame(): EmotionFrame {
    const face = Object.fromEntries(FACE_PARAM_NAMES.map((k) => [k, 0])) as EmotionFrame['face'];
    const body = Object.fromEntries(BODY_PARAM_NAMES.map((k) => [k, 0])) as EmotionFrame['body'];
    return { face, body, valence: 0, arousal: 0, gaze: { x: 0, y: 0 }, idle: false, t: 0 };
  }

  update(input: EmotionInput): void {
    this.lastInputAt = this.t;
    const add = (src: Partial<Record<EmotionId, number>> | undefined, gain: number) => {
      if (!src) return;
      for (const [id, raw] of Object.entries(src) as Array<[EmotionId, number]>) {
        if (!(EMOTION_IDS as readonly string[]).includes(id)) continue;
        const w = clamp01(Number.isFinite(raw) ? raw : 0) * gain;
        this.activation.set(id, clamp01((this.activation.get(id) ?? 0) + w));
      }
    };
    add(input.lexicon, 0.6);
    add(input.llmTags, 0.8);
  }

  setConfig(patch: Partial<EmotionConfig>): void {
    this.cfg = validateEmotionConfig({ ...this.cfg, ...patch });
    this.saccade = createSaccadeClock(
      { minMs: this.cfg.saccadeMinMs, maxMs: this.cfg.saccadeMaxMs },
      this.rng,
    );
  }

  getConfig(): EmotionConfig {
    return { ...this.cfg };
  }

  tick(dtMs: number): EmotionFrame {
    const dt = Math.max(0, dtMs);
    this.t += dt;

    // 1. decay activations toward zero
    for (const id of EMOTION_IDS) {
      const a = this.activation.get(id) ?? 0;
      if (a <= 0) continue;
      const next = a * Math.exp(-dt / CATALOG[id].decayMs);
      this.activation.set(id, next < 0.001 ? 0 : next);
    }

    // 2. weighted target channels over active emotions
    let wSum = 0;
    const tgtFace: Record<string, number> = {};
    const tgtBody: Record<string, number> = {};
    let tgtValence = 0;
    let tgtArousal = 0;
    for (const id of EMOTION_IDS) {
      const a = this.activation.get(id) ?? 0;
      if (a <= 0.001) continue;
      wSum += a;
      const e = CATALOG[id];
      for (const [k, v] of Object.entries(e.face)) tgtFace[k] = (tgtFace[k] ?? 0) + v * a;
      for (const [k, v] of Object.entries(e.body)) tgtBody[k] = (tgtBody[k] ?? 0) + v * a;
      tgtValence += e.valence * a;
      tgtArousal += e.arousal * a;
    }

    const idle = this.t - this.lastInputAt > this.cfg.idleAfterMs;
    // neutral floor keeps the face alive
    const floor = idle ? 0.4 : 0.15;
    const n = CATALOG.neutral;
    wSum += floor;
    for (const [k, v] of Object.entries(n.face)) tgtFace[k] = (tgtFace[k] ?? 0) + v * floor;
    for (const [k, v] of Object.entries(n.body)) tgtBody[k] = (tgtBody[k] ?? 0) + v * floor;

    // 3. normalize + exponential smoothing toward targets
    const alpha = 1 - Math.exp(-dt / this.cfg.blendTimeMs);
    const k = this.cfg.intensity * (idle ? 0.5 : 1);
    const face = {} as EmotionFrame['face'];
    for (const name of FACE_PARAM_NAMES) {
      const target = clamp01((tgtFace[name] ?? 0) / wSum) * k;
      const prev = this.current.face[name] ?? 0;
      face[name] = clamp01(prev + (target - prev) * alpha);
    }
    const body = {} as EmotionFrame['body'];
    for (const name of BODY_PARAM_NAMES) {
      const target = clamp11((tgtBody[name] ?? 0) / wSum) * k;
      const prev = this.current.body[name] ?? 0;
      body[name] = clamp11(prev + (target - prev) * alpha);
    }

    const g = this.saccade.tick(dt, tgtArousal / wSum);
    this.current = {
      face,
      body,
      valence: clamp11(tgtValence / wSum),
      arousal: clamp11(tgtArousal / wSum),
      gaze: { x: g.x, y: g.y },
      idle,
      t: this.t,
    };
    return structuredClone(this.current);
  }
}
