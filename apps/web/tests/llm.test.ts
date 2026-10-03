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

// ---- brain router (r2026-10-03.05) — provider selection from device storage ----

/** Swap in a fake localStorage for the duration of a test. */
function swapLs(data: Record<string, string>): () => void {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map(Object.entries(data));
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return () => {
    if (prev === undefined) delete g.localStorage;
    else g.localStorage = prev;
  };
}

describe('brain router', () => {
  it('auto picks keyless pollinations when nothing is stored', async () => {
    const restore = swapLs({});
    try {
      const { brainProvider, pickBrain } = await import('../lib/brain');
      expect(brainProvider()).toBe('auto');
      expect(pickBrain().spec.id).toBe('pollinations');
      expect(pickBrain().key).toBe('');
    } finally { restore(); }
  });

  it('auto prefers the first keyed provider (moonshot first)', async () => {
    const restore = swapLs({ 'amoji.brain.key.moonshot': 'sk-test' });
    try {
      const { pickBrain } = await import('../lib/brain');
      expect(pickBrain().spec.id).toBe('moonshot');
      expect(pickBrain().key).toBe('sk-test');
    } finally { restore(); }
  });

  it('explicit provider with a key is used as picked', async () => {
    const restore = swapLs({
      'amoji.brain.provider': 'groq',
      'amoji.brain.key.groq': 'gsk-test',
    });
    try {
      const { brainProvider, pickBrain } = await import('../lib/brain');
      expect(brainProvider()).toBe('groq');
      expect(pickBrain().spec.id).toBe('groq');
    } finally { restore(); }
  });

  it('explicit provider without a key falls back to the free lane', async () => {
    const restore = swapLs({ 'amoji.brain.provider': 'groq' });
    try {
      const { pickBrain } = await import('../lib/brain');
      expect(pickBrain().spec.id).toBe('pollinations');
    } finally { restore(); }
  });

  it('setBrainKey stores and clears', async () => {
    const restore = swapLs({});
    try {
      const { brainKey, setBrainKey } = await import('../lib/brain');
      setBrainKey('moonshot', '  sk-abc  ');
      expect(brainKey('moonshot')).toBe('sk-abc');
      setBrainKey('moonshot', '');
      expect(brainKey('moonshot')).toBe('');
    } finally { restore(); }
  });
});

describe('finishReply (streamed text)', () => {
  it('parses the emotion tag out of an accumulated reply', async () => {
    const { finishReply } = await import('../lib/client-chat');
    const r = finishReply('你好呀，今日開唔開心呀？\n[emotion:{"joy":0.9}]');
    expect(r.reply).toBe('你好呀，今日開唔開心呀？');
    expect(r.emotionHints.joy).toBe(0.9);
  });

  it('tolerates a tag split across stream chunks', async () => {
    const { finishReply } = await import('../lib/client-chat');
    // chunks as they might arrive over SSE, joined into the full reply
    const chunks = ['嗯…', '[emotion:', '{"confusion":0.7,"neutral":0.2}', ']'];
    const r = finishReply(chunks.join(''));
    expect(r.reply).toBe('嗯…');
    expect(r.emotionHints.confusion).toBe(0.7);
    expect(r.emotionHints.neutral).toBe(0.2);
  });
});
