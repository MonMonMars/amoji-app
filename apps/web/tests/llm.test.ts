import { describe, expect, it } from 'vitest';
import { OfflineLlm } from '../lib/llm';

describe('OfflineLlm', () => {
  it('returns a reply with lexicon-derived emotion hints', async () => {
    const llm = new OfflineLlm();
    const r = await llm.chat([{ role: 'user', content: 'I am so happy today!' }]);
    expect(r.reply.length).toBeGreaterThan(0);
    expect(r.emotionHints.joy).toBeGreaterThan(0.3);
  });
  it('handles empty history', async () => {
    const r = await new OfflineLlm().chat([]);
    expect(typeof r.reply).toBe('string');
  });
  it('parseEmotionHints extracts JSON block', async () => {
    const { parseEmotionHints } = await import('../lib/llm');
    const hints = parseEmotionHints('Let me think.\n[emotion:{"joy":0.8,"contempt":0.1}]\nDone.');
    expect(hints.joy).toBe(0.8);
    expect(hints.contempt).toBe(0.1);
  });
  it('parseEmotionHints returns {} on garbage', async () => {
    const { parseEmotionHints } = await import('../lib/llm');
    expect(parseEmotionHints('no tags here')).toEqual({});
  });
});
