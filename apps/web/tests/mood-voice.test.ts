import { describe, expect, it } from 'vitest';
import { MOOD_FILLERS, pickThinkingFiller } from '../lib/fillers';
import { MOOD_THINK, pickThinkPhrase } from '../lib/think-phrases';
import { MOOD_IDLE, pickMoodIdleLine } from '../lib/mood-chatter';

const MOODS = ['happy', 'tired', 'sad', 'angry', 'anxious', 'sick'];
const LANGS4 = ['yue', 'zh', 'ja', 'en'] as const;

describe('mood-tinted voice (r2026-10-03.24)', () => {
  it('every mood/lang filler bank has ≥3 lines and the picker stays inside it', () => {
    for (const mood of MOODS) {
      for (const lang of LANGS4) {
        const bank = MOOD_FILLERS[mood]![lang];
        expect(bank, `${mood}/${lang}`).toHaveLength(3);
        expect(bank).toContain(pickThinkingFiller(lang, mood));
      }
    }
  });

  it('a felt mood changes the filler — sad hmm ≠ neutral hmm', () => {
    const neutral = new Set<string>();
    for (let i = 0; i < 3; i++) neutral.add(pickThinkingFiller('en'));
    expect(neutral.has(pickThinkingFiller('en', 'sad'))).toBe(false);
  });

  it('thinking-out-loud phases wear the mood; unknown moods fall back to archetype', () => {
    for (const mood of MOODS) {
      expect(MOOD_THINK[mood]!.yue).toContain(pickThinkPhrase('blaze', 'yue', 0, mood));
    }
    expect(pickThinkPhrase('juno', 'en', 0)).not.toBe(pickThinkPhrase('juno', 'en', 0, 'sad'));
    expect(pickThinkPhrase('juno', 'en', 2, 'unknown')).toBe(pickThinkPhrase('juno', 'en', 2));
  });

  it('mood idle lines resolve per mood/lang and wrap deterministically', () => {
    expect(MOOD_IDLE.sad!.en).toContain(pickMoodIdleLine('sad', 'en', 0));
    expect(pickMoodIdleLine('unknown', 'en', 0)).toBeUndefined();
    expect(pickMoodIdleLine('sad', 'en', 4)).toBe(pickMoodIdleLine('sad', 'en', 0));
  });
});
