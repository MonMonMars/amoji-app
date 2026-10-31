import { describe, expect, it } from 'vitest';
import { finishReply } from '../lib/client-chat';

describe('finishReply laugh strip', () => {
  it('strips emotion tag and banned giggle tokens from the bubble text', () => {
    const r = finishReply('That was fun hehe and haha too.\n[emotion:{"joy":0.9}]');
    expect(r.reply.toLowerCase()).not.toMatch(/hehe|haha/);
    expect(r.reply).not.toMatch(/\[emotion/);
    expect(r.emotionHints.joy).toBe(0.9);
  });
});
