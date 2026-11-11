import { describe, expect, it } from 'vitest';
import { GTTS_YUE_MALE_PACE_FLOOR, PITCH_BIAS_MALE, gttsPlaybackRate } from '../lib/gtts';

describe('male Cantonese gTTS pace', () => {
  it('exports a pace floor above unity for male delivery compensation', () => {
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBeGreaterThan(1);
  });

  it('lifts playback when pitch bias would otherwise drag male yue below female pace', () => {
    const biased = gttsPlaybackRate(1, PITCH_BIAS_MALE, 'yue');
    expect(biased).toBe(GTTS_YUE_MALE_PACE_FLOOR);
    expect(gttsPlaybackRate(1, PITCH_BIAS_MALE, 'en-US')).toBeLessThan(1);
    expect(gttsPlaybackRate(1, 1.04, 'yue')).toBe(1.04);
  });
});
