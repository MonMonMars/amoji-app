import { describe, expect, it } from 'vitest';
import { ouchStyleFor, MOOD_OUCHES, OUCH_STYLE_DEFAULT, pickOuch } from '../lib/ouch';

const MOODS = ['happy', 'tired', 'sad', 'angry', 'anxious', 'sick'];
const LANGS4 = ['yue', 'zh', 'ja', 'en'] as const;

describe('mood-aware poke cries (r2026-10-03.26)', () => {
  it('every mood/lang ouch bank has ≥3 lines and the picker stays inside it', () => {
    for (const mood of MOODS) {
      for (const lang of LANGS4) {
        const bank = MOOD_OUCHES[mood]![lang];
        expect(bank, `${mood}/${lang}`).toHaveLength(3);
        expect(bank).toContain(pickOuch('juno', lang, 0, mood));
      }
    }
  });

  it('a felt mood changes the poke cry; unknown moods fall back to personality', () => {
    expect(pickOuch('juno', 'en', 0)).not.toBe(pickOuch('juno', 'en', 0, 'sad'));
    expect(pickOuch('cloud', 'yue', 1, 'unknown')).toBe(pickOuch('cloud', 'yue', 1));
  });

  it('a sad poke lands gentler than a happy one; no mood = the classic full startle', () => {
    expect(ouchStyleFor('sad').surprise).toBeLessThan(ouchStyleFor('happy').surprise);
    expect(ouchStyleFor('sad').joy).toBeLessThan(ouchStyleFor('happy').joy);
    expect(ouchStyleFor('sick').rate).toBeLessThan(0);
    expect(ouchStyleFor('tired').pitch).toBeLessThan(ouchStyleFor('happy').pitch);
    expect(ouchStyleFor()).toEqual(OUCH_STYLE_DEFAULT);
  });
});
