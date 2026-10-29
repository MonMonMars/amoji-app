import { afterEach, describe, expect, it } from 'vitest';
import { createBackend, type Backend } from '../src/http.js';
import { openDb } from '../src/db.js';
import { buildEdgeSsml, resolveEdgeVoice } from '../src/tts.js';
import type { DatabaseSync } from 'node:sqlite';

const open: DatabaseSync[] = [];

function app(now = () => 1_700_000_000_000): Backend {
  const db = openDb(':memory:');
  open.push(db);
  return createBackend({
    db,
    now,
    llm: 'offline',
    synthesize: async () => new Uint8Array([0xff, 0xfb, 0x10, 0x00]),
  });
}

afterEach(() => {
  for (const db of open) db.close();
  open.length = 0;
});

async function session(api: Backend): Promise<string> {
  const res = await api.handle(new Request('http://amoji.local/api/auth/session', { method: 'POST', body: '{}' }));
  expect(res.status).toBe(200);
  const body = await res.json() as { token: string };
  return body.token;
}

function authed(token: string, path: string, method: string, body?: unknown): Request {
  return new Request(`http://amoji.local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('production backend', () => {
  it('answers health without a session', async () => {
    const res = await app().handle(new Request('http://amoji.local/api/health'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, tts: 'edge', db: 'sqlite' });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('creates, resumes, and ends an anonymous session', async () => {
    const api = app();
    const token = await session(api);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const again = await api.handle(authed(token, '/api/auth/session', 'GET'));
    expect(again.status).toBe(200);
    const resumed = await api.handle(new Request('http://amoji.local/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }));
    expect(resumed.status).toBe(200);
    const gone = await api.handle(authed(token, '/api/auth/session', 'DELETE'));
    expect(gone.status).toBe(204);
    const after = await api.handle(authed(token, '/api/state', 'GET'));
    expect(after.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    let t = 1_000;
    const api = app(() => t);
    const token = await session(api);
    t += 31 * 24 * 60 * 60 * 1000;
    const res = await api.handle(authed(token, '/api/state', 'GET'));
    expect(res.status).toBe(401);
  });

  it('persists character and wardrobe for the session', async () => {
    const api = app();
    const token = await session(api);
    const empty = await api.handle(authed(token, '/api/state', 'GET'));
    expect(await empty.json()).toMatchObject({
      characterId: 'a01-shino',
      backgroundId: 'void',
      lang: 'yue',
      kidMode: false,
      wardrobe: null,
    });
    const saved = await api.handle(authed(token, '/api/state', 'PUT', {
      characterId: 'a02-shibu',
      backgroundId: 'sakura',
      lang: 'ja',
      kidMode: true,
      wardrobe: { headId: 'A02', bodyId: 'A120' },
    }));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      characterId: 'a02-shibu',
      backgroundId: 'sakura',
      lang: 'ja',
      kidMode: true,
      wardrobe: { headId: 'A02', bodyId: 'A120' },
    });
    const bad = await api.handle(authed(token, '/api/state', 'PUT', {
      wardrobe: { headId: 'A98', bodyId: 'A120' },
    }));
    expect(bad.status).toBe(400);
    const still = await api.handle(authed(token, '/api/state', 'GET'));
    expect(await still.json()).toMatchObject({ wardrobe: { headId: 'A02', bodyId: 'A120' } });
  });

  it('stores a chat turn and falls offline without calling a model', async () => {
    const api = app();
    const token = await session(api);
    const denied = await api.handle(new Request('http://amoji.local/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hi' }),
    }));
    expect(denied.status).toBe(401);
    const res = await api.handle(authed(token, '/api/chat', 'POST', {
      message: 'hello',
      history: [{ role: 'user', content: 'earlier' }],
      language: 'en',
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as { reply: string; provider: string };
    expect(body.provider).toBe('offline');
    expect(body.reply).toMatch(/\?/);
    const rows = api.db.prepare('SELECT role, content FROM chat_turns ORDER BY id').all() as Array<{ role: string }>;
    expect(rows.map((r) => r.role)).toEqual(['user', 'assistant']);
  });

  it('does not refetch when the client already sent weather facts', async () => {
    const db = openDb(':memory:');
    open.push(db);
    let called = false;
    const api = createBackend({
      db,
      llm: 'offline',
      gatherWorld: async () => {
        called = true;
        return { prompt: 'Weather: 1°C.', spoken: 'no' };
      },
      synthesize: async () => new Uint8Array([0]),
    });
    const token = await session(api);
    const res = await api.handle(authed(token, '/api/chat', 'POST', {
      message: 'weather',
      language: 'en',
      world: 'Weather: 29°C, clear.',
    }));
    expect(res.status).toBe(200);
    expect(called).toBe(false);
  });

  it('fills live weather on the server when the client sent none', async () => {
    const db = openDb(':memory:');
    open.push(db);
    const api = createBackend({
      db,
      llm: 'live',
      gatherWorld: async (message, language) => {
        expect(message).toBe('weather');
        expect(language).toBe('en');
        return { prompt: 'Weather: 21°C, clear.', spoken: 'It is about 21° and clear.' };
      },
      complete: async (input) => {
        const system = input.messages[0]?.content ?? '';
        expect(system).toContain('21°C');
        expect(system).toContain('Finish each sentence');
        return { content: 'I don\'t have live weather. [emotion:{"neutral":0.2}]', provider: 'test' };
      },
      synthesize: async () => new Uint8Array([0]),
    });
    const token = await session(api);
    const res = await api.handle(authed(token, '/api/chat', 'POST', { message: 'weather', language: 'en' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { reply: string; provider: string };
    expect(body.provider).toBe('test');
    expect(body.reply).toContain('21°');
    expect(body.reply).toMatch(/\?/);
    expect(body.reply.toLowerCase()).not.toContain("don't have");
  });

  it('speaks a live-fact line when the model throws', async () => {
    const db = openDb(':memory:');
    open.push(db);
    const api = createBackend({
      db,
      llm: 'live',
      complete: async () => { throw new Error('down'); },
      synthesize: async () => new Uint8Array([0]),
    });
    const token = await session(api);
    const res = await api.handle(authed(token, '/api/chat', 'POST', {
      message: 'weather',
      language: 'en',
      worldSpoken: 'It is 29° and drizzly in Hong Kong.',
    }));
    const body = await res.json() as { reply: string; provider: string };
    expect(body.provider).toBe('offline');
    expect(body.reply).toContain('29°');
    expect(body.reply).toMatch(/\?/);
  });

  it('speaks with the Edge default voice and honors an explicit neural name', async () => {
    expect(resolveEdgeVoice({ lang: 'yue', gender: 'female' }).name).toBe('zh-HK-HiuMaanNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'male' }).name).toBe('en-US-GuyNeural');
    const ssml = buildEdgeSsml('hi', resolveEdgeVoice({ lang: 'en', gender: 'female', voice: 'en-US-AriaNeural' }));
    expect(ssml).toContain("voice name='en-US-AriaNeural'");
    expect(ssml).toContain('xml:lang=\'en-US\'');
    const api = app();
    const token = await session(api);
    const res = await api.handle(authed(token, '/api/tts', 'POST', { text: 'Hello & <friend>' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('audio/mpeg');
    expect(res.headers.get('x-amoji-voice')).toBe('zh-HK-HiuMaanNeural');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xff);
    const empty = await api.handle(authed(token, '/api/tts', 'POST', { text: '   ' }));
    expect(empty.status).toBe(400);
  });
});
