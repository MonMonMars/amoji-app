import { describe, expect, it } from 'vitest';
import { CATALOG, EMOTION_IDS } from '../src/catalog';
import { FACE_PARAM_NAMES, BODY_PARAM_NAMES } from '../src/schema';

describe('emotion catalog', () => {
  it('defines exactly 19 emotions', () => {
    expect(EMOTION_IDS).toHaveLength(19);
    expect(new Set(EMOTION_IDS).size).toBe(19);
  });
  it('covers every channel on every emotion with in-range values', () => {
    for (const id of EMOTION_IDS) {
      const e = CATALOG[id];
      expect(Object.keys(e.face).sort()).toEqual([...FACE_PARAM_NAMES].sort());
      expect(Object.keys(e.body).sort()).toEqual([...BODY_PARAM_NAMES].sort());
      for (const v of Object.values(e.face)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      for (const v of Object.values(e.body)) { expect(v).toBeGreaterThanOrEqual(-1); expect(v).toBeLessThanOrEqual(1); }
      expect(e.decayMs).toBeGreaterThan(500);
      expect(Math.abs(e.valence)).toBeLessThanOrEqual(1);
      expect(Math.abs(e.arousal)).toBeLessThanOrEqual(1);
    }
  });
  it('neutral is a low-energy baseline', () => {
    const n = CATALOG.neutral;
    expect(Math.abs(n.arousal)).toBeLessThan(0.3);
    for (const v of Object.values(n.face)) expect(v).toBeLessThan(0.4);
  });
});
