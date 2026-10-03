import { describe, expect, it } from 'vitest';
// Per-character idle pose subsets (r2026-10-03.04).
import { IDLE_POSES, posesByIds, sampleIdlePoseFrom } from '../src/idle-poses';

describe('personality pose library', () => {
  it('ships a broad catalog with personality poses', () => {
    expect(IDLE_POSES.length).toBeGreaterThanOrEqual(20);
    for (const id of ['handsOnHips', 'chinStroke', 'bouncy', 'calmHug', 'stargaze', 'guardCross', 'readyStance', 'dreamyTilt']) {
      expect(IDLE_POSES.some((p) => p.id === id)).toBe(true);
    }
  });

  it('posesByIds resolves known ids and skips unknown ones', () => {
    const list = posesByIds(['stand', 'bouncy', 'no-such-pose']);
    expect(list.map((p) => p.id)).toEqual(['stand', 'bouncy']);
  });

  it('posesByIds falls back to the full catalog on empty input', () => {
    expect(posesByIds([]).length).toBe(IDLE_POSES.length);
    expect(posesByIds(['bogus-id']).length).toBe(IDLE_POSES.length);
  });

  it('subset samples stay inside the subset and are deterministic', () => {
    const subset = posesByIds(['stand', 'chinStroke', 'calmHug']);
    for (const t of [0, 5000, 12_345, 60_000, 500_000]) {
      const a = sampleIdlePoseFrom(t, 42, subset);
      const b = sampleIdlePoseFrom(t, 42, subset);
      expect(a).toEqual(b);
      expect(subset.some((p) => p.id === a.id)).toBe(true);
    }
  });

  it('full-catalog sampling matches the legacy sampleIdlePose contract', () => {
    const subset = sampleIdlePoseFrom(123_456, 7, IDLE_POSES);
    expect(IDLE_POSES.some((p) => p.id === subset.id)).toBe(true);
  });
});
