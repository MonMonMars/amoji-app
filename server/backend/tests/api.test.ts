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
    expect(await res.json()).toEqual({ ok: true, tts: 'edge', db: 'sqlite', mail: false, billing: false });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('publishes a systems inventory without a session', async () => {
    const res = await app().handle(new Request('http://amoji.local/api/systems'));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      mail: boolean;
      billing: boolean;
      freeServers: unknown[];
      corsLocked: boolean;
      securityRulesVersion: number;
      rateLimits: Array<{ id: string }>;
    };
    expect(body.mail).toBe(false);
    expect(body.billing).toBe(false);
    expect(body.freeServers.length).toBeGreaterThan(0);
    expect(body.corsLocked).toBe(false);
    expect(body.securityRulesVersion).toBe(1);
    expect(body.rateLimits.some((r) => r.id === 'global')).toBe(true);
  });

  it('wipes server product rows for the bearer session', async () => {
    const api = app();
    const token = await session(api);
    await api.handle(authed(token, '/api/state', 'PUT', {
      characterId: 'a01-shino',
      backgroundId: 'void',
      lang: 'en',
      kidMode: false,
    }));
    const wiped = await api.handle(authed(token, '/api/storage/me', 'DELETE'));
    expect(wiped.status).toBe(200);
    const body = await wiped.json() as { ok: boolean; removed: string[] };
    expect(body.ok).toBe(true);
    expect(body.removed.length).toBeGreaterThan(0);
    const again = await api.handle(authed(token, '/api/state', 'GET'));
    expect(again.status).toBe(401);
  });

  it('rejects storage wipe without a bearer', async () => {
    const res = await app().handle(new Request('http://amoji.local/api/storage/me', { method: 'DELETE' }));
    expect(res.status).toBe(401);
  });

  it('stores a content report and skips email when mail is off', async () => {
    const api = app();
    const res = await api.handle(new Request('http://amoji.local/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reason: 'offensive',
        reply: 'bad line',
        note: 'test',
        contactEmail: 'user@example.com',
      }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as { stored: boolean; emailed: boolean; mailConfigured: boolean };
    expect(body.stored).toBe(true);
    expect(body.emailed).toBe(false);
    expect(body.mailConfigured).toBe(false);
  });

  it('accepts anonymous support messages without a session', async () => {
    const api = app();
    const res = await api.handle(new Request('http://amoji.local/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'friend@example.com',
        message: 'Hello from the support form',
      }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      ok: boolean;
      stored: boolean;
      emailed: boolean;
      skipped: boolean;
      mailConfigured: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.stored).toBe(true);
    expect(body.emailed).toBe(false);
    expect(body.skipped).toBe(true);
    expect(body.mailConfigured).toBe(false);
  });

  it('rejects support posts missing an email', async () => {
    const res = await app().handle(new Request('http://amoji.local/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nope', message: 'hi' }),
    }));
    expect(res.status).toBe(400);
  });

  it('returns free entitlement for a fresh session', async () => {
    const api = app();
    const token = await session(api);
    const res = await api.handle(authed(token, '/api/billing/entitlement', 'GET'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ plan: 'free' });
  });

  it('rejects stripe webhook when billing is not configured', async () => {
    const res = await app().handle(new Request('http://amoji.local/api/billing/webhook', {
      method: 'POST',
      body: '{}',
    }));
    expect(res.status).toBe(503);
  });

  it('publishes billing rules without a session', async () => {
    const res = await app().handle(new Request('http://amoji.local/api/billing/rules'));
    expect(res.status).toBe(200);
    const body = await res.json() as { charging: { version: number }; payment: { demoMode: boolean } };
    expect(body.charging.version).toBe(1);
    expect(typeof body.payment.demoMode).toBe('boolean');
  });

  it('demo checkout endpoint grants Plus when AMOJI_BILLING_DEMO=1', async () => {
    const prev = process.env.AMOJI_BILLING_DEMO;
    process.env.AMOJI_BILLING_DEMO = '1';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PAYMENT_LINK;
    const api = app();
    const token = await session(api);
    const res = await api.handle(authed(token, '/api/billing/checkout', 'POST', {}));
    expect(res.status).toBe(200);
    const body = await res.json() as { mode: string; chargesRealMoney: boolean; plan: string };
    expect(body.mode).toBe('demo');
    expect(body.chargesRealMoney).toBe(false);
    expect(body.plan).toBe('plus');
    const ent = await api.handle(authed(token, '/api/billing/entitlement', 'GET'));
    expect(await ent.json()).toMatchObject({ plan: 'plus' });
    if (prev === undefined) delete process.env.AMOJI_BILLING_DEMO;
    else process.env.AMOJI_BILLING_DEMO = prev;
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
