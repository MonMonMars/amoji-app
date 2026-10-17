import { describe, expect, it } from 'vitest';
import { withQuestion } from '../lib/follow-up';

describe('follow-up questions', () => {
  it('appends a question when the reply has none', () => {
    expect(withQuestion('今日好開心', 'yue')).toBe('今日好開心 你覺得點呀？');
    expect(withQuestion('Nice day', 'en')).toContain('What do you think?');
  });

  it('leaves a reply that already asks something', () => {
    expect(withQuestion('你好呀？', 'yue')).toBe('你好呀？');
  });
});
