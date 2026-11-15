import { describe, expect, it } from 'vitest';
import {
  GTTS_PITCH_BIAS_MIN,
  GTTS_YUE_MALE_PACE_FLOOR,
  PITCH_BIAS_FEMALE,
  PITCH_BIAS_MALE,
  gttsPlaybackRate,
} from '../lib/gtts';
import { MALE_TIER_OFFSET, gttsCharacterPitchBias } from '../lib/gtts-timbre';

describe('male Cantonese gTTS pace', () => {
  it('uses an absolute floor at pitch min (not mid-band) so deep≠mid', () => {
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBe(GTTS_PITCH_BIAS_MIN);
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBeLessThan(PITCH_BIAS_MALE);
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBeLessThan(PITCH_BIAS_FEMALE);
  });

  it('does not lift deep male yue into mid — deep stays below mid', () => {
    const mid = gttsPlaybackRate(1, PITCH_BIAS_MALE, 'yue');
    const deepBias = gttsCharacterPitchBias('male', undefined, 'yue', 'deep');
    const deep = gttsPlaybackRate(1, deepBias, 'yue');
    expect(mid).toBe(PITCH_BIAS_MALE);
    expect(deep).toBeLessThan(mid);
    expect(deep).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
    // Offset must survive the floor (legacy 0.80/0.88 floors erased this gap).
    expect(mid - deep).toBeGreaterThanOrEqual(Math.abs(MALE_TIER_OFFSET.deep) - 1e-9);
    expect(gttsPlaybackRate(1, PITCH_BIAS_MALE, 'en-US')).toBe(PITCH_BIAS_MALE);
    expect(gttsPlaybackRate(1, PITCH_BIAS_FEMALE, 'yue')).toBe(PITCH_BIAS_FEMALE);
  });
});
