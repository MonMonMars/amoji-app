import { describe, expect, it } from 'vitest';
import { emotionIntensityScale, emotionProsody, NEURAL_PROSODY } from '../lib/emotion-prosody';

describe('emotionProsody', () => {
  it('scales mild hints softer than strong tags', () => {
    const mild = emotionProsody('joy', 0.4);
    const strong = emotionProsody('joy', 0.95);
    expect(Math.abs(strong.pitch)).toBeGreaterThan(Math.abs(mild.pitch));
    expect(Math.abs(strong.rate)).toBeGreaterThan(Math.abs(mild.rate));
  });

  it('keeps soft moods from squeaking at high intensity', () => {
    const full = NEURAL_PROSODY.love!;
    const soft = emotionProsody('love', 1);
    // love is soft-capped: not a full 1.0 multiply at intensity 1
    expect(Math.abs(soft.pitch)).toBeLessThan(Math.abs(full.pitch) * 0.99);
  });

  it('emotionIntensityScale floors quiet feelings', () => {
    expect(emotionIntensityScale(0)).toBe(0.35);
    expect(emotionIntensityScale(1)).toBe(1);
    expect(emotionIntensityScale(0.2)).toBe(0.35);
  });

  it('neutral stays flat', () => {
    expect(emotionProsody('neutral', 0.9)).toEqual({ rate: 0, pitch: 0, vol: 0 });
  });
});
