import { describe, expect, it } from 'vitest';
import { replyLooksNonsense } from '../lib/reply-sanity';

describe('replyLooksNonsense', () => {
  it('rejects empty and template filler', () => {
    expect(replyLooksNonsense('…')).toBe(true);
    expect(replyLooksNonsense("I'm always here for you.")).toBe(true);
    expect(replyLooksNonsense('一切都会好起来的，加油！')).toBe(true);
    expect(replyLooksNonsense('希望幫到你呀。')).toBe(true);
  });

  it('rejects reasoning leaks and wrong-language sludge', () => {
    expect(replyLooksNonsense('The user wants comfort. Okay.')).toBe(true);
    expect(replyLooksNonsense('分析：用戶想傾偈。')).toBe(true);
    expect(
      replyLooksNonsense('Today you look tired and work must be hard.', { language: 'yue', lastUser: '今日好攰' }),
    ).toBe(true);
  });

  it('keeps a grounded Cantonese answer', () => {
    const good = '聽落你今日好攰喎。你想唔想講多啲俾我聽？';
    expect(replyLooksNonsense(good, { language: 'yue', lastUser: '返工好攰' })).toBe(false);
  });

  it('skips story mode persona', () => {
    expect(replyLooksNonsense('short', { persona: 'STORY MODE: late train' })).toBe(false);
  });

  it('skips recipe/detail turns', () => {
    expect(replyLooksNonsense('…', { detailed: true })).toBe(false);
  });
});
