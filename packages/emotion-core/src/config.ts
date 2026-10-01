import type { EmotionConfig } from './schema';

export const DEFAULT_EMOTION_CONFIG: EmotionConfig = {
  blendTimeMs: 250,
  idleAfterMs: 8000,
  saccadeMinMs: 300,
  saccadeMaxMs: 2600,
  intensity: 1,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validateEmotionConfig(input: unknown): EmotionConfig {
  if (input !== null && (typeof input !== 'object' || Array.isArray(input))) {
    throw new Error('invalid config: expected an object');
  }
  const src = (input ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_EMOTION_CONFIG };
  if (src.blendTimeMs !== undefined) {
    if (!isNum(src.blendTimeMs) || src.blendTimeMs <= 0) throw new Error('invalid config: blendTimeMs must be > 0');
    out.blendTimeMs = src.blendTimeMs;
  }
  if (src.idleAfterMs !== undefined) {
    if (!isNum(src.idleAfterMs) || src.idleAfterMs < 0) throw new Error('invalid config: idleAfterMs must be >= 0');
    out.idleAfterMs = src.idleAfterMs;
  }
  if (src.saccadeMinMs !== undefined) {
    if (!isNum(src.saccadeMinMs) || src.saccadeMinMs <= 0) throw new Error('invalid config: saccadeMinMs must be > 0');
    out.saccadeMinMs = src.saccadeMinMs;
  }
  if (src.saccadeMaxMs !== undefined) {
    if (!isNum(src.saccadeMaxMs) || src.saccadeMaxMs < out.saccadeMinMs) throw new Error('invalid config: saccadeMaxMs must be >= saccadeMinMs');
    out.saccadeMaxMs = src.saccadeMaxMs;
  }
  if (src.intensity !== undefined) {
    if (!isNum(src.intensity) || src.intensity < 0 || src.intensity > 1) throw new Error('invalid config: intensity must be in [0,1]');
    out.intensity = src.intensity;
  }
  return out;
}
