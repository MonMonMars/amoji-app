import { describe, expect, it } from 'vitest';
import { EmotionEngine } from '../src/engine';
import { FACE_PARAM_NAMES, BODY_PARAM_NAMES } from '../src/schema';

const tickFor = (e: EmotionEngine, ms: number, step = 50) => {
  const frames = [];
  for (let t = 0; t < ms; t += step) frames.push(e.tick(step));
  return frames;
};

describe('EmotionEngine', () => {
  it('produces in-range frames with all channels', () => {
    const e = new EmotionEngine({}, 42);
    e.update({ llmTags: { joy: 1 } });
    const f = tickFor(e, 1000).at(-1)!;
    for (const k of FACE_PARAM_NAMES) { expect(f.face[k]).toBeGreaterThanOrEqual(0); expect(f.face[k]).toBeLessThanOrEqual(1); }
    for (const k of BODY_PARAM_NAMES) { expect(Math.abs(f.body[k])).toBeLessThanOrEqual(1); }
    expect(f.face.mouthSmile).toBeGreaterThan(0.3);
    expect(f.valence).toBeGreaterThan(0.3);
  });
  it('decays back toward neutral baseline', () => {
    const e = new EmotionEngine({}, 1);
    e.update({ llmTags: { anger: 1 } });
    const early = tickFor(e, 500).at(-1)!;
    const late = tickFor(e, 30000).at(-1)!;
    expect(late.face.mouthSmile).toBeLessThanOrEqual(early.face.mouthSmile + 0.2);
    expect(late.face.browDown).toBeLessThan(0.35);
  });
  it('is deterministic for a fixed seed', () => {
    const a = new EmotionEngine({}, 99);
    const b = new EmotionEngine({}, 99);
    a.update({ llmTags: { joy: 0.8 } });
    b.update({ llmTags: { joy: 0.8 } });
    const fa = tickFor(a, 2000);
    const fb = tickFor(b, 2000);
    expect(fa).toEqual(fb);
  });
  it('goes idle after idleAfterMs of no input', () => {
    const e = new EmotionEngine({ idleAfterMs: 500 }, 3);
    e.update({ llmTags: { joy: 1 } });
    expect(tickFor(e, 300).at(-1)!.idle).toBe(false);
    expect(tickFor(e, 600).at(-1)!.idle).toBe(true);
  });
  it('clamps bad input without throwing', () => {
    const e = new EmotionEngine({}, 5);
    e.update({ llmTags: { joy: 99, contempt: -5 } as never });
    expect(() => tickFor(e, 200)).not.toThrow();
  });
  it('setConfig validates and applies live', () => {
    const e = new EmotionEngine({}, 5);
    e.setConfig({ intensity: 0.5 });
    expect(e.getConfig().intensity).toBe(0.5);
    expect(() => e.setConfig({ intensity: 3 })).toThrow(/invalid config:/);
  });
});
