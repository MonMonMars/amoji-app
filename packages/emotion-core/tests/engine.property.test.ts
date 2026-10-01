import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { EmotionEngine } from '../src/engine';
import { EMOTION_IDS } from '../src/schema';

const emotionWeightsArb = fc.record(
  Object.fromEntries(EMOTION_IDS.map((id) => [id, fc.option(fc.double({ min: -1, max: 2 }), { nil: undefined })])),
  { noNullPrototype: true },
);

describe('EmotionEngine properties', () => {
  it('frames always in range regardless of hostile input', () => {
    fc.assert(fc.property(emotionWeightsArb, fc.integer({ min: 0, max: 10_000 }), fc.integer(), (tags, ticks, seed) => {
      const e = new EmotionEngine({}, seed);
      e.update({ llmTags: tags as never });
      for (let i = 0; i < 20; i++) {
        const f = e.tick(Math.max(1, Math.floor(ticks / 20)));
        for (const v of Object.values(f.face)) { if (v < 0 || v > 1) return false; }
        for (const v of Object.values(f.body)) { if (v < -1 || v > 1) return false; }
        if (Math.abs(f.valence) > 1 || Math.abs(f.arousal) > 1) return false;
      }
      return true;
    }), { numRuns: 200 });
  });
  it('activations never increase without input', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), fc.integer(), (dt, seed) => {
      const e = new EmotionEngine({}, seed);
      e.update({ llmTags: { joy: 1 } });
      const smile = (f: { face: Record<string, number> }) => f.face.mouthSmile ?? 0;
      // Settle ~1500ms of wall-clock so the smoothed value (250ms time
      // constant) has caught up with the slowly-decaying target; only after
      // that crossing must it be monotonic non-increasing.
      for (let t = 0; t < 1500; t += dt) e.tick(dt);
      let prev = smile(e.tick(dt));
      for (let i = 0; i < 30; i++) {
        const cur = smile(e.tick(dt));
        if (cur > prev + 1e-9) return false;
        prev = cur;
      }
      return true;
    }), { numRuns: 200 });
  });
});
