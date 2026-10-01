import { describe, expect, it } from 'vitest';

describe('package index', () => {
  it('re-exports the public API', async () => {
    const api = await import('../src/index');
    expect(api.EmotionEngine).toBeTypeOf('function');
    expect(api.analyzeText).toBeTypeOf('function');
    expect(api.CATALOG.neutral).toBeDefined();
    expect(api.DEFAULT_EMOTION_CONFIG.blendTimeMs).toBeGreaterThan(0);
    expect(api.validateEmotionConfig({})).toBeDefined();
  });
});
