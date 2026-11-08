import { describe, expect, it } from 'vitest';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';
import { idleClipById } from '../lib/idle-clips';
import { FAREWELL_WAVE_CLIP_ID, isFarewellOnlyIdleClip } from '../lib/idle-farewell';
import { playableIdles } from '../lib/idle-library';
import fs from 'node:fs';
import path from 'node:path';

const CHITCHAT = ['lib_C25', 'LookAround', 'Thinking', 'IdleInnersceneSam'] as const;
const BREATHE = ['IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing'] as const;

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

  it('maps dance keywords and joy hints to playful idles', () => {
    const kw = resolveChatAutoIdle({ assistantText: 'Let us dance tonight!' });
    expect(kw).toBe('lib_C113');
    const joy = resolveChatAutoIdle({
      assistantText: 'That sounds fun.',
      emotionHints: { joy: 0.9 },
    });
    expect(joy).toBe('IdleMixamoHappy');
  });

  it('falls back to breathing rails for neutral replies', () => {
    const clip = resolveChatAutoIdle({ assistantText: 'Sure, tell me more.' });
    expect(BREATHE as readonly string[]).toContain(clip);
    expect(clip).not.toBe(FAREWELL_WAVE_CLIP_ID);
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
