import { describe, expect, it } from 'vitest';
import { DEFAULT_EMOTION_CONFIG, validateEmotionConfig } from '../src/config';

describe('config', () => {
  it('has sane defaults', () => {
    expect(DEFAULT_EMOTION_CONFIG.blendTimeMs).toBe(250);
    expect(DEFAULT_EMOTION_CONFIG.idleAfterMs).toBe(8000);
    expect(DEFAULT_EMOTION_CONFIG.saccadeMinMs).toBe(300);
    expect(DEFAULT_EMOTION_CONFIG.saccadeMaxMs).toBe(2600);
    expect(DEFAULT_EMOTION_CONFIG.intensity).toBe(1);
  });
  it('fills defaults for partial input', () => {
    const c = validateEmotionConfig({ intensity: 0.5 });
    expect(c.intensity).toBe(0.5);
    expect(c.blendTimeMs).toBe(DEFAULT_EMOTION_CONFIG.blendTimeMs);
  });
  it('rejects out-of-range values', () => {
    expect(() => validateEmotionConfig({ intensity: 2 })).toThrow(/invalid config:/);
    expect(() => validateEmotionConfig({ saccadeMinMs: -1 })).toThrow(/invalid config:/);
    expect(() => validateEmotionConfig({ blendTimeMs: 0 })).toThrow(/invalid config:/);
  });
});
