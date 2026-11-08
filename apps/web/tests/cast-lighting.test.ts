import { describe, expect, it } from 'vitest';
import {
  CAST_AMBIENT_INTENSITY,
  CAST_FILL_INTENSITY,
  CAST_HEMI_INTENSITY,
  CAST_KEY_INTENSITY,
  CAST_TONE_MAPPING_EXPOSURE,
  castToneMappingExposure,
} from '../lib/vrm/cast-lighting';
import { castLightingMultipliers, characterIdFromModelRef } from '../lib/vrm/cast-lighting-profile';

describe('cast daylight constants', () => {
  it('keeps the r108 chat intensities locked for a shared cast look', () => {
    expect(CAST_TONE_MAPPING_EXPOSURE).toBe(1.0);
    expect(CAST_HEMI_INTENSITY).toBe(0.85);
    expect(CAST_KEY_INTENSITY).toBe(1.75);
    expect(CAST_FILL_INTENSITY).toBe(0.3);
    expect(CAST_AMBIENT_INTENSITY).toBe(0.14);
  });
});

describe('per-character cast lighting', () => {
  it('leaves unlisted ids at unit multipliers', () => {
    expect(castLightingMultipliers('a14-vivi')).toEqual({
      hemi: 1,
      key: 1,
      fill: 1,
      ambient: 1,
      exposure: 1,
    });
  });

  it('softens VRoid ref #1–2 under the shared key', () => {
    const m = castLightingMultipliers('a01-shino');
    expect(m.key).toBeLessThan(1);
    expect(m.ambient).toBeGreaterThan(1);
    expect(castToneMappingExposure('a02-shibu')).toBeLessThan(CAST_TONE_MAPPING_EXPOSURE);
  });

  it('parses roster ids from model paths', () => {
    expect(characterIdFromModelRef('/models/want/a01-shino.vrm')).toBe('a01-shino');
    expect(characterIdFromModelRef('https://cdn.example/a63-hinoame-satuki-mei-sirayuki.vrm?x=1')).toBe(
      'a63-hinoame-satuki-mei-sirayuki',
    );
  });
});
