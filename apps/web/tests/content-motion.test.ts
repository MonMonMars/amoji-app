import { describe, expect, it } from 'vitest';
import { resolveContentMotion, moodHintsFromText } from '../lib/content-motion';

describe('content-driven motion director (not LLM)', () => {
  it('maps dance / sing / goodbye from chat text', () => {
    expect(resolveContentMotion({ userText: '來跳舞吧' }).move).toBe('dance');
    expect(resolveContentMotion({ userText: '唱首歌' }).move).toBe('sing');
    expect(resolveContentMotion({ userText: '拜拜，遲啲見' }).move).toBe('goodbye');
  });

  it('picks thinking idle while generating', () => {
    const plan = resolveContentMotion({ thinking: true });
    expect(plan.idleClip).toBe('Thinking');
    expect(plan.move).toBeUndefined();
  });

  it('open greet stays passive (no wave / no dance)', () => {
    const plan = resolveContentMotion({ openGreet: true, assistantText: '你好呀' });
    expect(plan.move).toBeUndefined();
    expect(plan.idleClip).toBeTruthy();
    expect(plan.idleClip).not.toBe('HelloWave');
    expect(plan.passive).toBe(true);
  });

  it('ordinary Q&A stays calm — no sticky dance from joy words alone', () => {
    const plan = resolveContentMotion({
      userText: '今日天氣點呀？',
      assistantText: '今日多雲，好開心呀。',
    });
    expect(plan.move).toBeUndefined();
    expect(plan.idleClip).toBeTruthy();
    expect(plan.idleClip).not.toBe('lib_C113');
  });

  it('derives mood hints from text lexicon, not requiring LLM tags', () => {
    const hints = moodHintsFromText('I am so happy and excited today!');
    expect(hints).toBeTruthy();
    expect(Object.keys(hints!).length).toBeGreaterThan(0);
  });

  it('prefers user intent over assistant wording for moves', () => {
    const plan = resolveContentMotion({
      userText: '彈鋼琴',
      assistantText: '好呀，我跳舞畀你睇！',
    });
    expect(plan.move).toBe('piano');
  });

  it('assistant mentioning dance does not start a move on topical talk', () => {
    const plan = resolveContentMotion({
      userText: '今日天氣點呀？',
      assistantText: '好呀，我跳舞畀你睇！今日多雲。',
    });
    expect(plan.move).toBeUndefined();
  });
});
