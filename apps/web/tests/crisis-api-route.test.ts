import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { crisisReplyText } from '../lib/crisis';

/**
 * The server route is the other place a message can reach a model. These tests
 * stub the LLM factories so "the model was called" is directly observable.
 */

const chatSpy = vi.fn(async () => ({ reply: 'MODEL REPLY', emotionHints: {} }));
const freeSpy = vi.fn(async () => ({ reply: 'FREE REPLY', emotionHints: {} }));
const llmFactory = vi.fn(() => ({ chat: chatSpy }));
const freeFactory = vi.fn(() => ({ chat: freeSpy }));

vi.mock('../lib/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/llm')>();
  return {
    ...actual,
    createLlm: () => llmFactory(),
    PollinationsLlm: class { chat = (...a: Parameters<typeof freeSpy>) => freeSpy(...a); },
  };
});
vi.mock('../lib/live-tools', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/live-tools')>();
  return {
    ...actual,
    serverLiveContext: async () => ({ prompt: '', spoken: '' }),
    preferLiveReply: (reply: string) => reply,
  };
});

const post = async (body: unknown) => {
  const { POST } = await import('../app/api/chat/route');
  const res = await POST(new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: res.status, json: await res.json() as Record<string, unknown> };
};

describe('/api/chat crisis guard', () => {
  beforeEach(() => {
    chatSpy.mockClear();
    freeSpy.mockClear();
    llmFactory.mockClear();
    freeFactory.mockClear();
  });
  afterEach(() => vi.clearAllMocks());

  it('never calls the model for a Cantonese crisis message', async () => {
    const { json } = await post({ message: '我真係好想死', language: 'yue' });
    expect(chatSpy).not.toHaveBeenCalled();
    expect(freeSpy).not.toHaveBeenCalled();
    expect(json.reply).toBe(crisisReplyText('yue'));
    expect(json.crisis).toBe(true);
  });

  it('never calls the model for a Mandarin crisis message', async () => {
    const { json } = await post({ message: '我不想活了', language: 'zh' });
    expect(chatSpy).not.toHaveBeenCalled();
    expect(json.reply).toBe(crisisReplyText('zh'));
  });

  it('never calls the model for an English crisis message', async () => {
    const { json } = await post({ message: 'I want to kill myself', language: 'en' });
    expect(chatSpy).not.toHaveBeenCalled();
    expect(json.reply).toBe(crisisReplyText('en'));
    // en → US region numbers (location-aware; no geo hints on the API path)
    expect(String(json.reply)).toContain('988');
    expect(String(json.reply)).not.toContain('2389 2222');
  });

  it('does not run any live-tools lookup for a crisis message', async () => {
    const live = await import('../lib/live-tools');
    const spy = vi.spyOn(live, 'serverLiveContext');
    chatSpy.mockClear();
    freeSpy.mockClear();
    const { json } = await post({ message: '我想自殺', language: 'yue' });
    // response is produced by the guard; no tool call is observable
    expect(json.crisis).toBe(true);
    expect(chatSpy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('/api/chat benign messages still reach the model', () => {
  beforeEach(() => {
    chatSpy.mockClear();
    freeSpy.mockClear();
    llmFactory.mockClear();
    freeFactory.mockClear();
    chatSpy.mockResolvedValue({ reply: 'MODEL REPLY', emotionHints: {} });
  });
  afterEach(() => vi.clearAllMocks());

  const BENIGN = [
    '今日天氣好好呀',
    '笑死我喇',
    'tell me a joke',
    'I am exhausted after work today',
    '我今日好開心',
    'what should I cook tonight?',
  ];

  for (const message of BENIGN) {
    it(`passes "${message}" through to the model`, async () => {
      const { json } = await post({ message, language: 'yue' });
      expect(chatSpy).toHaveBeenCalledTimes(1);
      expect(json.reply).toBe('MODEL REPLY');
      expect(json.crisis).toBeUndefined();
    });
  }
});

describe('/api/chat guards the boundary regardless of caller', () => {
  it('rejects an empty message before any model call', async () => {
    const { status, json } = await post({ message: '   ' });
    expect(status).toBe(400);
    expect(json.error).toBe('message required');
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it('guards when the caller sends no language at all (defaults to Cantonese reply)', async () => {
    const { json } = await post({ message: '我想死' });
    expect(chatSpy).not.toHaveBeenCalled();
    expect(json.reply).toBe(crisisReplyText('yue'));
  });
});
