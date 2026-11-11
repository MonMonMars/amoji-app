import { describe, expect, it } from 'vitest';
import {
  resolveContentMotion,
  moodHintsFromText,
  detectContentMove,
  preferredPerfIdleForContent,
} from '../lib/content-motion';
import { resolvePerfMotion } from '../lib/performance-motion';

describe('content-driven motion director (not LLM)', () => {
  it('maps dance / sing / goodbye from chat text', () => {
    expect(resolveContentMotion({ userText: '來跳舞吧' }).move).toBe('dance');
    expect(resolveContentMotion({ userText: '唱首歌' }).move).toBe('sing');
    expect(resolveContentMotion({ userText: '拜拜，遲啲見' }).move).toBe('goodbye');
  });

  it('picks thinking idle while generating', () => {
    const plan = resolveContentMotion({ thinking: true });
    expect(plan.idleClip).toBe('IdleSassy');
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

  it('weather / news / story talk uses calm look/breathe idle, not dance', () => {
    const calm = ['LookAround', 'IdleRpmFStanding001', 'IdleRpmMVar001', 'IdleSassy'];
    const weather = resolveContentMotion({
      userText: '今日天氣點呀？',
      assistantText: '今日多雲，大概 26 度，帶件薄外套，take care。',
    });
    expect(weather.move).toBeUndefined();
    expect(calm).toContain(weather.idleClip);
    expect(weather.idleClip).not.toMatch(/^lib_C11[1234]$/);

    const news = resolveContentMotion({
      userText: '讀新聞俾我聽',
      assistantText: '有條趣聞：街坊貓咪贏咗比賽。',
    });
    expect(news.move).toBeUndefined();
    expect(news.idleClip).not.toMatch(/^lib_C11[1234]$/);

    const story = resolveContentMotion({
      userText: '講個小故事',
      assistantText: '從前有一隻小貓，好鍾意晒太陽……',
    });
    expect(story.move).toBeUndefined();
    expect(story.idleClip).not.toMatch(/^lib_C11[1234]$/);
  });

  it('assistant dance offer after weather does not start a dance move', () => {
    const plan = resolveContentMotion({
      userText: '今日天氣點呀？',
      assistantText: '今日多雲。Want to see me dancing later?',
    });
    expect(plan.move).toBeUndefined();
    expect(plan.idleClip).not.toMatch(/^lib_C11[1234]$/);
  });

  it('cheer / clap emotion beats fire from assistant reply text', () => {
    expect(detectContentMove('我考完試喇', '加油！你做得好好！')).toBe('cheer');
    expect(detectContentMove('我升職喇', '恭喜你！鼓掌！')).toBe('clap');
    expect(resolveContentMotion({
      userText: '我考完試喇',
      assistantText: '加油！你做得好好！',
    }).move).toBe('cheer');
  });

  it('activity moves stay user-only; assistant dance wording alone does not move', () => {
    expect(detectContentMove('今日天氣點', '好呀，我跳舞畀你睇！')).toBeUndefined();
    expect(detectContentMove('來跳舞吧', '好呀！')).toBe('dance');
  });

  it('dance / sing prefer performance-motion shortlist idle clips', () => {
    const dance = resolveContentMotion({ userText: '來跳舞吧', assistantText: '好！' });
    expect(dance.move).toBe('dance');
    const dancePref = preferredPerfIdleForContent('dance', '來跳舞吧');
    expect(dancePref).toBeTruthy();
    expect(dance.idleClip).toBe(dancePref);

    const soft = resolveContentMotion({
      userText: 'sing a soft ballad for me',
      assistantText: '好，我唱。',
    });
    expect(soft.move).toBe('sing');
    const softProfile = resolvePerfMotion({
      id: 'content-song',
      kind: 'song',
      style: 'soft ballad',
    });
    expect(softProfile.preferredClipIds[0]).toBe('lib_C112');
    expect(soft.idleClip).toBe('lib_C112');
  });

  it('session farewell pins goodbye + HelloWave', () => {
    const plan = resolveContentMotion({
      sessionFarewell: true,
      assistantText: '拜拜',
    });
    expect(plan.move).toBe('goodbye');
    expect(plan.idleClip).toBe('HelloWave');
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
