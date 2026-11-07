import { describe, expect, it } from 'vitest';
import { withQuestion } from '../lib/follow-up';

describe('follow-up questions', () => {
  it('appends a question when the reply has none', () => {
    expect(withQuestion('今日好開心', 'yue')).toMatch(/[?？]$/);
    expect(withQuestion('Nice day', 'en')).toMatch(/[?]$/);
  });

  it('leaves a reply that already asks something', () => {
    expect(withQuestion('你好呀？', 'yue')).toBe('你好呀？');
  });

  it('does not tack a question onto a goodbye', () => {
    const bye = '好啦，我要走先喇，拜拜。';
    expect(withQuestion(bye, 'yue')).toBe(bye);
    expect(withQuestion('Okay, good night!', 'en')).toBe('Okay, good night!');
  });

  it('asks something on-topic rather than the empty "what do you think"', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja']) {
      const line = withQuestion('The rain finally stopped.', lang);
      expect(line).not.toMatch(/what do you think/i);
      expect(line).not.toContain('你覺得點呀');
    }
  });

  it('is deterministic for the same reply', () => {
    expect(withQuestion('Nice day', 'en')).toBe(withQuestion('Nice day', 'en'));
  });
});
