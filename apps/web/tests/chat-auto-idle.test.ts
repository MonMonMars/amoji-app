import { describe, expect, it } from 'vitest';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';
import { idleClipById } from '../lib/idle-clips';
import fs from 'node:fs';
import path from 'node:path';

describe('chat auto idle resolver', () => {
  it('maps greet keywords to a playable wave/greet clip', () => {
    const clip = resolveChatAutoIdle({ assistantText: 'Hello! Nice to meet you.' });
    expect(clip).toBeTruthy();
    expect(idleClipById(clip!)).toBeTruthy();
    expect(['HelloWave', 'Bow']).toContain(clip);
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
    expect(['IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing']).toContain(clip);
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
