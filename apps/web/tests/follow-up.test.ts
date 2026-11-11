import { describe, expect, it } from 'vitest';
import { isFactSpokenLine, withQuestion } from '../lib/follow-up';

describe('follow-up questions', () => {
  it('does not append a question by default', () => {
    expect(withQuestion('今日好開心', 'yue')).toBe('今日好開心');
    expect(withQuestion('Nice day', 'en')).toBe('Nice day');
  });

  it('can append a question when forceFollowUp is set', () => {
    expect(withQuestion('今日好開心', 'yue', { forceFollowUp: true })).toMatch(/[?？]$/);
    expect(withQuestion('Nice day', 'en', { forceFollowUp: true })).toMatch(/[?]$/);
  });


  it('never appends a question onto weather/news fact reads', () => {
    const news = 'From the news: Scientists find quirky deep-sea fish.';
    const weather = 'It is about 22 degrees and cloudy. Take care!';
    expect(isFactSpokenLine(news)).toBe(true);
    expect(isFactSpokenLine(weather)).toBe(true);
    expect(withQuestion(news, 'en', { forceFollowUp: true })).toBe(news);
    expect(withQuestion(weather, 'en', { forceFollowUp: true })).toBe(weather);
    expect(withQuestion(news, 'en', { forceFollowUp: true, factsSpoken: true })).toBe(news);
    expect(withQuestion(news, 'en', { forceFollowUp: true })).not.toMatch(/\?\s*$/);
  });

  it('leaves a reply that already asks something', () => {
    expect(withQuestion('你好呀？', 'yue')).toBe('你好呀？');
  });

  it('does not tack a question onto a goodbye even when forced', () => {
    const bye = '好啦，我要走先喇，拜拜。';
    expect(withQuestion(bye, 'yue', { forceFollowUp: true })).toBe(bye);
    expect(withQuestion('Okay, good night!', 'en', { forceFollowUp: true })).toBe('Okay, good night!');
  });

  it('forced follow-ups avoid the empty "what do you think"', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja']) {
      const line = withQuestion('The rain finally stopped.', lang, { forceFollowUp: true });
      expect(line).not.toMatch(/what do you think/i);
      expect(line).not.toContain('你覺得點呀');
    }
  });

  it('is deterministic for the same reply when forced', () => {
    expect(withQuestion('Nice day', 'en', { forceFollowUp: true })).toBe(
      withQuestion('Nice day', 'en', { forceFollowUp: true }),
    );
  });
});
