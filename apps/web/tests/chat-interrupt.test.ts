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
  it('detects explicit new-topic pivots (yue/en)', () => {
    for (const text of ['新話題', '转话题', 'new topic', '講第二樣', 'start over']) {
      expect(userWantsNewTopic(text)).toBe(true);
    }
    for (const text of ['咕嚕肉再酸啲得唔得', '點搵', '你問點搵', 'Pee Saaya', "let's talk about colors"]) {
      expect(userWantsNewTopic(text)).toBe(false);
    }
  });

  it('halt includes stop and new-topic', () => {
    expect(userWantsHaltSpeech('停')).toBe(true);
    expect(userWantsHaltSpeech('新話題')).toBe(true);
    expect(userWantsHaltSpeech('hello')).toBe(false);
    expect(userWantsHaltSpeech('點搵')).toBe(false);
  });

  it('wipes continuation + history only on new topic — not on stop', () => {
    expect(resolveChatInterruptOnSend('停').clearContentContinuation).toBe(false);
    expect(resolveChatInterruptOnSend('停').wipeChatHistory).toBe(false);
    expect(resolveChatInterruptOnSend('新話題').clearContentContinuation).toBe(true);
    expect(resolveChatInterruptOnSend('新話題').wipeChatHistory).toBe(true);
    expect(resolveChatInterruptOnSend('hello').clearContentContinuation).toBe(false);
    expect(resolveChatInterruptOnSend('點搵').wipeChatHistory).toBe(false);
  });
});

describe('chat interrupt — ChatPanel wiring (P0)', () => {
  it('send() consults resolveChatInterruptOnSend before continuation', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).toContain('resolveChatInterruptOnSend');
    expect(chat).toContain('turnMessages');
    expect(chat).toContain('historyRef');
    const sendBlock = chat.slice(chat.indexOf('const send = async'), chat.indexOf('const beginVoiceMode = async'));
    expect(sendBlock.indexOf('resolveChatInterruptOnSend')).toBeLessThan(
      sendBlock.indexOf('resolveContentContinuationOnSend'),
    );
  });
});
