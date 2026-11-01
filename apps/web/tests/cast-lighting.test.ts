import { describe, expect, it } from 'vitest';
import {
  CAST_AMBIENT_INTENSITY,
  CAST_FILL_INTENSITY,
  CAST_HEMI_INTENSITY,
  CAST_KEY_INTENSITY,
  CAST_TONE_MAPPING_EXPOSURE,
} from '../lib/vrm/cast-lighting';

describe('cast daylight constants', () => {
  it('keeps the r108 chat intensities locked for a shared cast look', () => {
    expect(CAST_TONE_MAPPING_EXPOSURE).toBe(1.0);
    expect(CAST_HEMI_INTENSITY).toBe(0.85);
    expect(CAST_KEY_INTENSITY).toBe(1.75);
    expect(CAST_FILL_INTENSITY).toBe(0.3);
    expect(CAST_AMBIENT_INTENSITY).toBe(0.14);
  });
});
