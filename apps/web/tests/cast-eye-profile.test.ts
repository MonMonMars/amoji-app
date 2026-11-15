import { describe, expect, it } from 'vitest';
import {
  CAST_EYE_ATLAS_EXPR,
  CAST_EYE_ATLAS_FLOOR,
  CAST_EYE_BLINK_CAP,
  CAST_EYE_SQUINT_CAP,
  CAST_EYE_WIDE_CAP,
} from '../lib/vrm/cast-eye-profile';

const SAMPLE_IDS = [
  'a01-shino',
  'a02-shibu',
  'a03-fumiriya',
  'a14-vivi',
  'a63-hinoame-satuki-mei-sirayuki',
  'a94-rita',
] as const;

describe('unified cast eye profile', () => {
  it('locks shared caps for every roster id (no per-character knobs)', () => {
    expect(CAST_EYE_BLINK_CAP).toBeGreaterThan(0.3);
    expect(CAST_EYE_BLINK_CAP).toBeLessThan(0.85);
    expect(CAST_EYE_WIDE_CAP).toBeLessThan(CAST_EYE_SQUINT_CAP);
    expect(CAST_EYE_ATLAS_FLOOR).toBeGreaterThan(0);
    expect(CAST_EYE_ATLAS_EXPR.length).toBeGreaterThanOrEqual(5);
    // Caps are module constants — same for every sample id.
    for (const _id of SAMPLE_IDS) {
      expect(CAST_EYE_WIDE_CAP).toBe(0.32);
      expect(CAST_EYE_BLINK_CAP).toBe(0.55);
    }
  });
});
