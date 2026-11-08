import { describe, expect, it } from 'vitest';
import {
  formatTopicSuggestionLine,
  pickTopicSuggestions,
  userUndecided,
  wantsLongCompanionReply,
} from '../lib/topic-suggestions';

describe('topic suggestions', () => {
  it('picks 2–3 distinct topics per language', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja']) {
      const topics = pickTopicSuggestions(lang, 42, 3);
      expect(topics.length).toBe(3);
      expect(new Set(topics).size).toBe(3);
      const line = formatTopicSuggestionLine(lang, topics);
      expect(line.length).toBeGreaterThan(12);
    }
  });

  it('detects undecided short replies', () => {
    expect(userUndecided("I don't know")).toBe(true);
    expect(userUndecided('唔知')).toBe(true);
    expect(userUndecided('tell me a story about cats')).toBe(false);
  });

  it('flags story / fun fact for longer replies', () => {
    expect(wantsLongCompanionReply('tell me a fun fact')).toBe(true);
    expect(wantsLongCompanionReply('講個故事')).toBe(true);
    expect(wantsLongCompanionReply('hi')).toBe(false);
  });
});
