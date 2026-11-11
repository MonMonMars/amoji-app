import { describe, expect, it } from 'vitest';
import { looksLikeUserEcho, replyLooksNonsense } from '../lib/reply-sanity';
import { shapeCompanionReply } from '../lib/reply-shape';
import { BASE_SYSTEM } from '../lib/llm';

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

  it('rejects presence nags, meta topic sludge, and surreal metaphor', () => {
    expect(replyLooksNonsense("You've gone quiet on me.")).toBe(true);
    expect(replyLooksNonsense('Still on that thread with you.')).toBe(true);
    expect(replyLooksNonsense('Holding this soft moment with you.')).toBe(true);
    expect(replyLooksNonsense('I nicknamed a friendly riddle after this soft moment.')).toBe(true);
    expect(replyLooksNonsense('一個小謎語充滿電，等一陣細爆發。')).toBe(true);
    expect(replyLooksNonsense('軍艦開到極光那邊。')).toBe(true);
  });

  it('rejects opaque jargon and invented vocab with no meaning', () => {
    expect(replyLooksNonsense('Your quantum vibes are aligning today.')).toBe(true);
    expect(replyLooksNonsense('個vibe好靚喎。', { language: 'yue', lastUser: '今日開心' })).toBe(true);
    expect(replyLooksNonsense('Vibes check. What are we vibing to?')).toBe(true);
    expect(replyLooksNonsense('オーラ同期できてるよ。', { language: 'ja', lastUser: '元気' })).toBe(true);
    expect(replyLooksNonsense('灵魂频率对上了。', { language: 'zh', lastUser: '开心' })).toBe(true);
  });

  it('rejects near-echo of the user message', () => {
    expect(looksLikeUserEcho('今日好攰呀', '今日好攰呀')).toBe(true);
    expect(looksLikeUserEcho('聽落你今日好攰喎。', '返工好攰')).toBe(false);
    expect(replyLooksNonsense('今日返工好攰', { lastUser: '今日返工好攰' })).toBe(true);
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

describe('smooth anti-nonsense shaping', () => {
  it('strips vague sludge sentences while keeping the grounded answer', () => {
    const raw = "I'm always here for you. Your exam sounded brutal — rest a bit tonight.";
    const out = shapeCompanionReply(raw);
    expect(out.toLowerCase()).not.toMatch(/always here/);
    expect(out.toLowerCase()).toContain('exam');
  });

  it('strips opaque jargon sludge while keeping the caring answer', () => {
    const raw = 'Your quantum vibes are aligning. Sounds like a hard day — I am with you on that.';
    const out = shapeCompanionReply(raw);
    expect(out.toLowerCase()).not.toMatch(/quantum vibes/);
    expect(out.toLowerCase()).toMatch(/hard day|with you/);
  });

  it('BASE_SYSTEM requires listen-first care, plain words, and smooth connectors', () => {
    expect(BASE_SYSTEM).toMatch(/LISTEN FIRST/i);
    expect(BASE_SYSTEM).toMatch(/care|respect/i);
    expect(BASE_SYSTEM).toMatch(/PLAIN WORDS/i);
    expect(BASE_SYSTEM).toMatch(/first sentence MUST/i);
    expect(BASE_SYSTEM).toMatch(/SMOOTH TURNS/i);
    expect(BASE_SYSTEM).toMatch(/you've gone quiet/i);
    expect(BASE_SYSTEM).toMatch(/holding this topic/i);
    expect(BASE_SYSTEM).toMatch(/opaque vocab|invented|jargon|vibe|quantum|resonance/i);
  });
});

