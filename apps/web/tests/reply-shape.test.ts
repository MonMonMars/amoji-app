import { describe, expect, it } from 'vitest';
import { shapeCompanionReply } from '../lib/reply-shape';
import { finishReply } from '../lib/client-chat';

describe('shapeCompanionReply', () => {
  it('drops a planning leak and keeps the spoken answer', () => {
    const raw = `The user is asking about the weather. I should respond in character.

Haha, it's about 29 degrees and drizzling. Want to stay in with tea?`;
    const out = shapeCompanionReply(raw);
    expect(out).toBe("Haha, it's about 29 degrees and drizzling. Want to stay in with tea?");
    expect(out.toLowerCase()).not.toContain('the user');
  });

  it('keeps personality and a finished question', () => {
    const line = '哇，今日好凍呀……想唔想斟杯茶？';
    expect(shapeCompanionReply(line)).toBe(line);
  });

  it('reads the final channel and drops a cut-off tail', () => {
    const raw = '<|channel|>analysis<|message|>plan the reply<|end|><|channel|>final<|message|>It is raining in town. and the';
    expect(shapeCompanionReply(raw)).toBe('It is raining in town.');
  });

  it('leaves a single short sound alone', () => {
    expect(shapeCompanionReply('嗯…')).toBe('嗯…');
    expect(finishReply('嗯…[emotion:{"confusion":0.4}]').reply).toBe('嗯…');
  });

  it('keeps numbered cook-along steps', () => {
    const raw = '1. Simmer the tomatoes until soft.\n2. Stir in the salt. Want a taste?';
    const out = shapeCompanionReply(raw);
    expect(out).toContain('Simmer the tomatoes');
    expect(out).toContain('Stir in the salt');
    expect(out).toMatch(/\?/);
  });

  it('keeps an unfinished clause while the stream is still growing', () => {
    expect(shapeCompanionReply('It is raining in town. and the', { streaming: true })).toContain('and the');
  });
});
