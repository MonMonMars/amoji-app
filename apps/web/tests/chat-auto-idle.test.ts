import { describe, expect, it } from 'vitest';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';
import { idleClipById } from '../lib/idle-clips';
import { FAREWELL_WAVE_CLIP_ID, isFarewellOnlyIdleClip } from '../lib/idle-farewell';
import { playableIdles } from '../lib/idle-library';
import fs from 'node:fs';
import path from 'node:path';

const CHITCHAT = ['lib_C25', 'LookAround', 'Thinking', 'IdleInnersceneSam'] as const;
const NEUTRAL = ['IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing', 'LookAround', 'Thinking', 'IdleNeutral'];
const TALK = ['LookAround', 'IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing', 'IdleNeutral', 'Thinking'];

describe('chat auto idle resolver', () => {
  it('maps greet keywords to chit-chat idles, not HelloWave', () => {
    const clip = resolveChatAutoIdle({ assistantText: 'Hello! Nice to meet you.' });
    expect(clip).toBeTruthy();
    expect(idleClipById(clip!)).toBeTruthy();
    expect(clip).not.toBe(FAREWELL_WAVE_CLIP_ID);
    expect(CHITCHAT as readonly string[]).toContain(clip);
  });

  it('open greet uses chit-chat, never the wave clip', () => {
    const clip = resolveChatAutoIdle({ assistantText: '', openGreet: true });
    expect(clip).not.toBe(FAREWELL_WAVE_CLIP_ID);
    expect(CHITCHAT as readonly string[]).toContain(clip);
  });

  it('farewell assistant lines pin the wave clip', () => {
    const clip = resolveChatAutoIdle({ assistantText: '拜拜，遲啲見！' });
    expect(clip).toBe(FAREWELL_WAVE_CLIP_ID);
  });

  it('session farewell selects HelloWave', () => {
    expect(resolveChatAutoIdle({ assistantText: '', sessionFarewell: true })).toBe(FAREWELL_WAVE_CLIP_ID);
  });

  it('uses Thinking while the assistant is generating', () => {
    expect(resolveChatAutoIdle({ assistantText: '', thinking: true })).toBe('Thinking');
  });

  it('maps explicit USER dance keywords to a performance dance idle', () => {
    // Assistant-only dance offer must NOT start a show (Mon: dance only when asked).
    const offer = resolveChatAutoIdle({ assistantText: 'Let us dance tonight!' });
    expect(NEUTRAL).toContain(offer);
    const user = resolveChatAutoIdle({ assistantText: 'Sure!', userText: '跳舞吧' });
    // Leggy shortlist — hip-hop / dance-loop with free feet
    expect(['lib_C61', 'lib_C03', 'lib_C113', 'lib_C114', 'lib_C118', 'lib_C125']).toContain(user);
  });

  it('maps USER music / concert keywords to a listening / music-pose idle, not calm LookAround', () => {
    const clip = resolveChatAutoIdle({ userText: '播個音樂會', assistantText: '好呀，一起聽。' });
    expect(['lib_C112', 'lib_C61', 'lib_C03', 'lib_C41', 'lib_C113']).toContain(clip);
    const en = resolveChatAutoIdle({
      userText: 'play some concert music',
      assistantText: 'That concert sounds amazing!',
    });
    expect(['lib_C41', 'lib_C112', 'lib_C113', 'lib_C114', 'lib_C03', 'lib_C61', 'lib_C110', 'IdleMixamoHappy']).toContain(en);
    expect(en).not.toBe('LookAround');
  });

  it('does not treat generic joy hints as sing/dance idles', () => {
    const joy = resolveChatAutoIdle({
      assistantText: 'That sounds fun.',
      emotionHints: { joy: 0.9 },
    });
    expect(NEUTRAL).toContain(joy);
  });

  it('maps USER sing intent to a sing / performance idle (not calm breath)', () => {
    const sing = resolveChatAutoIdle({
      userText: '唱首歌',
      assistantText: '好，我來唱。',
      emotionHints: { joy: 0.85 },
    });
    // soft ballad / generic sing → C112 preferred, else IdleMixamoHappy
    expect(['lib_C112', 'IdleMixamoHappy', 'lib_C116']).toContain(sing);
  });

  it('weather / news / story talk stays look/breathe calm — never dance', () => {
    const weather = resolveChatAutoIdle({
      userText: '今日天氣點呀？',
      assistantText: '今日多雲，大概 26 度。Want to dance later?',
    });
    expect(TALK).toContain(weather);
    expect(weather).not.toMatch(/^lib_C11[1234]$/);

    const news = resolveChatAutoIdle({
      userText: 'any news?',
      assistantText: 'Here is a light headline about a funny cat contest.',
    });
    expect(TALK).toContain(news);

    const story = resolveChatAutoIdle({
      userText: 'tell me a story',
      assistantText: 'Once upon a time a fox met a crow…',
    });
    expect(TALK).toContain(story);
  });

  it('falls back to neutral chat idles for ordinary Q&A', () => {
    const clip = resolveChatAutoIdle({ assistantText: 'Sure, tell me more.' });
    expect(NEUTRAL).toContain(clip);
    expect(clip).not.toBe(FAREWELL_WAVE_CLIP_ID);
  });

  it('varies neutral idles across different reply text', () => {
    const a = resolveChatAutoIdle({ assistantText: 'First neutral reply.' });
    const b = resolveChatAutoIdle({ assistantText: 'A totally different answer about cats.' });
    expect(NEUTRAL).toContain(a);
    expect(NEUTRAL).toContain(b);
    expect(a).not.toBe(b);
  });

  it('does not match loose party wording without dance', () => {
    const clip = resolveChatAutoIdle({ assistantText: 'We had a fun party last weekend.' });
    expect(NEUTRAL).toContain(clip);
  });
});

describe('HelloWave (#15) farewell-only in library', () => {
  it('is marked farewell-only and omitted from passive rotation pool', () => {
    expect(isFarewellOnlyIdleClip(FAREWELL_WAVE_CLIP_ID)).toBe(true);
    expect(playableIdles().some((e) => e.clipId === FAREWELL_WAVE_CLIP_ID)).toBe(false);
  });

  it('still resolves via idleClipById for pinned auto-idle', () => {
    expect(idleClipById(FAREWELL_WAVE_CLIP_ID)?.playable).toBe(true);
  });
});

describe('chat page idle rails removed', () => {
  const chat = fs.readFileSync(path.resolve(import.meta.dirname, '../app/chat/page.tsx'), 'utf8');

  it('does not mount IdlePickRails on /chat', () => {
    expect(chat).not.toContain('IdlePickRails');
    expect(chat).toContain('resolveChatAutoIdle');
    expect(chat).toContain('onAutoIdle');
  });
});
