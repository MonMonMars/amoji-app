import { describe, expect, it } from 'vitest';
import { buildMemoryBlock, type Memory } from '../lib/memory';
import { userExplicitlyWantsRecall } from '../lib/privacy-recall';

describe('userExplicitlyWantsRecall', () => {
  it('detects explicit recall / continue requests', () => {
    expect(userExplicitlyWantsRecall('你記得昨日講咩未？')).toBe(true);
    expect(userExplicitlyWantsRecall('remember what I said about hiking')).toBe(true);
    expect(userExplicitlyWantsRecall('今日好攰呀')).toBe(false);
  });
});

describe('buildMemoryBlock privacy gate', () => {
  const mem: Memory = {
    userName: 'Pixel',
    facts: ['likes: hiking'],
    entries: [],
    exchanges: 5,
    moods: [],
    updatedAt: '',
    diary: [],
    lastThread: { day: 'Mon', user: 'secret topic', reply: 'ok' },
  };

  it('injects name only until the user asks to recall', () => {
    const gated = buildMemoryBlock('yue', mem, '今日幾好');
    expect(gated?.block).toContain('Pixel');
    expect(gated?.block).toMatch(/唔好主動提起/);
    expect(gated?.block).not.toContain('secret topic');
    const open = buildMemoryBlock('yue', mem, '你記得上次傾咩未？');
    expect(open?.block).toContain('secret topic');
  });
});
