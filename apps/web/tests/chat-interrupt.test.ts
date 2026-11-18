import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  resolveChatInterruptOnSend,
  userWantsHaltSpeech,
  userWantsNewTopic,
} from '../lib/chat-interrupt';

describe('chat interrupt — phrase detection', () => {
  it('detects new-topic pivots (yue/en)', () => {
    for (const text of ['新話題', '转话题', 'new topic', "let's talk about weather", '講第二樣']) {
      expect(userWantsNewTopic(text)).toBe(true);
    }
    expect(userWantsNewTopic('咕嚕肉再酸啲得唔得')).toBe(false);
  });

  it('halt includes stop and new-topic', () => {
    expect(userWantsHaltSpeech('停')).toBe(true);
    expect(userWantsHaltSpeech('新話題')).toBe(true);
    expect(userWantsHaltSpeech('hello')).toBe(false);
  });

  it('clears content session on stop or new topic', () => {
    expect(resolveChatInterruptOnSend('停', true).clearContentContinuation).toBe(true);
    expect(resolveChatInterruptOnSend('新話題', true).clearContentContinuation).toBe(true);
    expect(resolveChatInterruptOnSend('hello', true).clearContentContinuation).toBe(false);
  });
});

describe('chat interrupt — ChatPanel wiring (P0)', () => {
  it('send() consults resolveChatInterruptOnSend before continuation', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).toContain('resolveChatInterruptOnSend');
    const sendBlock = chat.slice(chat.indexOf('const send = async'), chat.indexOf('const beginVoiceMode = async'));
    expect(sendBlock.indexOf('resolveChatInterruptOnSend')).toBeLessThan(
      sendBlock.indexOf('resolveContentContinuationOnSend'),
    );
  });
});
