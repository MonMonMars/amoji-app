import { describe, expect, it } from 'vitest';
import {
  GTTS_YUE_MALE_PACE_FLOOR,
  PITCH_BIAS_FEMALE,
  PITCH_BIAS_MALE,
  gttsPlaybackRate,
} from '../lib/gtts';

describe('male Cantonese gTTS pace', () => {
  it('uses a soft floor that stays in the male pitch band (not female mid)', () => {
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBeLessThan(0.85);
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBeLessThan(PITCH_BIAS_FEMALE);
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBeGreaterThanOrEqual(PITCH_BIAS_MALE);
  });

  it('does not lift male yue playback into the female band', () => {
    const biased = gttsPlaybackRate(1, PITCH_BIAS_MALE, 'yue');
    expect(biased).toBe(GTTS_YUE_MALE_PACE_FLOOR);
    expect(biased).toBeLessThan(0.85);
    expect(gttsPlaybackRate(1, PITCH_BIAS_MALE, 'en-US')).toBe(PITCH_BIAS_MALE);
    expect(gttsPlaybackRate(1, PITCH_BIAS_FEMALE, 'yue')).toBe(PITCH_BIAS_FEMALE);
  });
});
