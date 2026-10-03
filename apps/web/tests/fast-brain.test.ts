// r2026-10-04.46: fast-brain — capped prompt history, the free-lane race
// config, and the instant local lane that keeps the conversation alive at
// zero latency when every brain is slow or down.
import { describe, expect, it } from 'vitest';
import {
  localFallbackReply, trimHistoryForPrompt, PROMPT_HISTORY_CAP, RACE_MODELS,
} from '../lib/client-chat';
import type { ChatMessage } from '../lib/llm';

const msg = (i: number): ChatMessage => ({
  role: i % 2 ? 'user' : 'assistant',
  content: `m${i}`,
});

describe('trimHistoryForPrompt', () => {
  it('keeps short histories untouched', () => {
    const short = [msg(0), msg(1), msg(2)];
    expect(trimHistoryForPrompt(short)).toHaveLength(3);
  });

  it('caps long histories to the most recent turns, preserving order', () => {
    const long = Array.from({ length: 40 }, (_, i) => msg(i));
    const trimmed = trimHistoryForPrompt(long);
    expect(trimmed).toHaveLength(PROMPT_HISTORY_CAP);
    expect(trimmed[0]!.content).toBe(`m${40 - PROMPT_HISTORY_CAP}`);
    expect(trimmed[trimmed.length - 1]!.content).toBe('m39');
  });
});

describe('localFallbackReply', () => {
  it('answers in every language, always ending with a question (continuity)', () => {
    for (const lang of ['yue', 'zh', 'ja', 'en']) {
      const r = localFallbackReply('今日好開心呀', lang);
      expect(r.reply.length, lang).toBeGreaterThan(4);
      const tail = r.reply.trim();
      expect(tail.endsWith('？') || tail.endsWith('?'), `${lang}: ${r.reply}`).toBe(true);
    }
  });

  it('unknown languages fall back to Cantonese and never crash', () => {
    const r = localFallbackReply('hello', 'fr');
    expect(r.reply.length).toBeGreaterThan(4);
  });

  it('wears the emotion read from the user words when it can', () => {
    const r = localFallbackReply('我好嬲呀!', 'yue');
    expect(r.emotionHints).toBeDefined();
  });
});

describe('free-lane race config', () => {
  it('races at least two models so the fastest first token wins', () => {
    expect(RACE_MODELS.length).toBeGreaterThanOrEqual(2);
    expect(RACE_MODELS).toContain('openai');
  });
});
