import { describe, expect, it } from 'vitest';
import { laughStyleFor, MOOD_GIGGLES, pickLaugh } from '../lib/laugh';

const MOODS = ['happy', 'tired', 'sad', 'angry', 'anxious', 'sick'];
const LANGS4 = ['yue', 'zh', 'ja', 'en'] as const;

describe('mood-aware laughs (r2026-10-03.25)', () => {
  it('every mood/lang giggle bank has ≥3 lines and the picker stays inside it', () => {
    for (const mood of MOODS) {
      for (const lang of LANGS4) {
        const bank = MOOD_GIGGLES[mood]![lang];
        expect(bank, `${mood}/${lang}`).toHaveLength(3);
        expect(bank).toContain(pickLaugh('juno', lang, 0, mood));
      }
    }
  });

  it('a felt mood changes the laugh; unknown moods fall back to personality', () => {
    expect(pickLaugh('juno', 'en', 0)).not.toBe(pickLaugh('juno', 'en', 0, 'sad'));
    expect(pickLaugh('cloud', 'yue', 1, 'unknown')).toBe(pickLaugh('cloud', 'yue', 1));
  });

  it('sad laughs land softer and slower than happy ones; no mood = default full laugh', () => {
    expect(laughStyleFor('sad').joy).toBeLessThan(laughStyleFor('happy').joy);
    expect(laughStyleFor('tired').rate).toBeLessThan(0);
    expect(laughStyleFor('sick').pitch).toBeLessThan(laughStyleFor('happy').pitch);
    expect(laughStyleFor()).toEqual(laughStyleFor('happy'));
  });
});
