// r2026-11-08.142 — the free lane races HOSTS, not aliases of one model.
//
// The old RACE_MODELS = ['openai-fast', 'openai'] sent two requests at the
// SAME Pollinations model (the live /models list shows every one of those ids
// is an alias of "GPT-OSS 20B Reasoning LLM (OVH)"), spending two slots of one
// anonymous IP budget for zero diversity. These tests pin the replacement:
// independent hosts, one request per host, a per-host cooldown, and a fallback
// that behaves exactly as it did before.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FREE_RACERS, OVH_MODEL, POLLINATIONS_MODEL, RACER_COOLDOWN_MS,
  clientChat, eligibleRacers, markRacerSent, raceFreeLanes, racerCoolingDown,
  resetRacerCooldowns, selectRacers,
} from '../lib/client-chat';
import type { ChatMessage } from '../lib/llm';

const userMsg: ChatMessage[] = [{ role: 'user', content: '今日返工好攰呀' }];

/** One SSE body carrying `text`, shaped exactly like a real OpenAI chunk. */
function sse(text: string): Response {
  const chunk = {
    choices: [{ index: 0, delta: { role: 'assistant', content: text } }],
  };
  const body = `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/** A fetch stub that answers per host and records what was actually sent. */
function stubHosts(answers: Record<string, () => Response | Promise<Response>>) {
  const calls: Array<{ url: string; body: string }> = [];
  const fetchStub = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? '') });
    const host = Object.keys(answers).find((h) => url.startsWith(h));
    if (!host) throw new Error(`unstubbed host: ${url}`);
    return answers[host]!();
  });
  vi.stubGlobal('fetch', fetchStub);
  return { calls, fetchStub };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('racer specs are genuinely independent hosts', () => {
  it('targets at least two different companies', () => {
    const hosts = new Set(FREE_RACERS.map((r) => r.host));
    expect(hosts.size).toBeGreaterThanOrEqual(2);
    expect(hosts.size).toBe(FREE_RACERS.length);
  });

  it('never sends the same host+model pair twice', () => {
    const pairs = FREE_RACERS.map((r) => `${r.host}::${r.model}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('asks Pollinations exactly ONCE, under its one anonymous model', () => {
    const pollinations = FREE_RACERS.filter((r) => r.host === 'pollinations');
    expect(pollinations).toHaveLength(1);
    // the old bug in one line: the single spec must not be alias-racing itself
    expect(FREE_RACERS.filter((r) => r.host === 'pollinations')).toHaveLength(1);
    const req = pollinations[0]!.buildRequest({
      system: 's', messages: userMsg, maxTokens: 100,
    });
    expect(req.transport).toBe('http');
    if (req.transport !== 'http') throw new Error('expected http');
    expect(req.url.startsWith('https://text.pollinations.ai')).toBe(true);
    expect((req.body as { model?: string }).model).toBe(POLLINATIONS_MODEL);
  });

  it('each HTTP racer points at its own origin and posts its own model', () => {
    const origins: string[] = [];
    for (const spec of FREE_RACERS) {
      const req = spec.buildRequest({ system: 's', messages: userMsg, maxTokens: 100 });
      if (req.transport !== 'http') continue;
      origins.push(new URL(req.url).origin);
      // anonymous by design: no bearer token anywhere in the free lane
      expect(Object.keys(req.headers).map((h) => h.toLowerCase())).not.toContain('authorization');
      expect((req.body as { model?: string; stream?: boolean }).stream).toBe(true);
    }
    // no two racers share an origin — the whole point of racing hosts
    expect(new Set(origins).size).toBe(origins.length);
    expect(origins.length).toBeGreaterThanOrEqual(2);
  });

  it('only a host that accepts it sends reasoning_effort (OVH 400s on it)', () => {
    const bodies = FREE_RACERS.filter((r) => r.host === 'ovhcloud').map((r) =>
      r.buildRequest({ system: 's', messages: userMsg, maxTokens: 100 }),
    );
    for (const b of bodies) {
      expect(b.transport).toBe('http');
      if (b.transport !== 'http') continue;
      expect('reasoning_effort' in b.body).toBe(false);
      expect((b.body as { model?: string }).model).toBe(OVH_MODEL);
    }
  });
});

describe('per-host cooldown protects the anonymous budget', () => {
  beforeEach(() => { resetRacerCooldowns(); });

  it('suppresses a second Pollinations attempt inside the window', () => {
    const poll = FREE_RACERS.find((r) => r.id === 'pollinations')!;
    const t0 = 1_000_000;
    expect(racerCoolingDown(poll, t0)).toBe(false);
    markRacerSent(poll.id, t0);
    // immediately after, and 1ms before the window closes: still suppressed
    expect(racerCoolingDown(poll, t0)).toBe(true);
    expect(racerCoolingDown(poll, t0 + RACER_COOLDOWN_MS.pollinations - 1)).toBe(true);
    expect(racerCoolingDown(poll, t0 + RACER_COOLDOWN_MS.pollinations)).toBe(false);
    expect(RACER_COOLDOWN_MS.pollinations).toBeGreaterThanOrEqual(30_000);
  });

  it('skips the cooling host and keeps the other hosts live', () => {
    const t0 = 1_000_000;
    markRacerSent('pollinations', t0);
    const picked = selectRacers(t0 + 1_000).map((r) => r.id);
    expect(picked).not.toContain('pollinations');
    expect(picked.length).toBeGreaterThanOrEqual(1);
    expect(eligibleRacers(t0 + 1_000).length).toBe(FREE_RACERS.length - 1);
  });

  it('never dead-ends: every armed cooldown still leaves a lane to answer', () => {
    const t0 = 1_000_000;
    for (const r of FREE_RACERS) markRacerSent(r.id, t0);
    const picked = selectRacers(t0 + 10);
    // Puter has no anonymous per-IP budget, so a burst can always fall back
    // to it rather than leaving the user with silence.
    expect(picked.length).toBeGreaterThanOrEqual(1);
    expect(picked.map((r) => r.host)).toContain('puter');
  });

  it('a rapid second message does not fire Pollinations again', async () => {
    // Puter's SDK is a browser global; stub it so the third host can answer
    // instead of failing on a missing document.
    vi.stubGlobal('window', {
      puter: {
        ai: {
          chat: async () => (async function* () {
            yield { text: '我在呀。' };
          })(),
        },
      },
    });
    const { calls } = stubHosts({
      'https://text.pollinations.ai': () => sse('第一句。'),
      'https://oai.endpoints.kepler.ai.cloud.ovh.net': () => sse('第二句。'),
    });
    try {
      await raceFreeLanes('s', userMsg, undefined, 64);
      const firstPoll = calls.filter((c) => c.url.startsWith('https://text.pollinations.ai')).length;
      expect(firstPoll).toBe(1); // ONE request, not two aliases

      calls.length = 0;
      const second = await raceFreeLanes('s', userMsg, undefined, 64);
      const secondPoll = calls.filter((c) => c.url.startsWith('https://text.pollinations.ai')).length;
      expect(secondPoll).toBe(0); // inside the 35s window → skipped
      // the other hosts still answered, so the user is never left silent
      expect(second.trim().length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
      resetRacerCooldowns();
    }
  });
});

describe('degrading cleanly across hosts', () => {
  beforeEach(() => { resetRacerCooldowns(); });
  afterAll(() => { vi.unstubAllGlobals(); resetRacerCooldowns(); });

  it('when one racer 402s the others still win the reply', async () => {
    stubHosts({
      'https://text.pollinations.ai': () => new Response('{"error":"Payment Required"}', { status: 402 }),
      'https://oai.endpoints.kepler.ai.cloud.ovh.net': async () => {
        await wait(5);
        return sse('我陪你傾下啦，今日發生咩事？');
      },
    });
    try {
      const text = await raceFreeLanes('s', userMsg, undefined, 64);
      // whichever surviving host wins, the reply must be real text — never
      // an error string and never empty
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toMatch(/402|429|empty|failed/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('a 402 also restarts that host\'s cooldown so the spent slot is not retried', async () => {
    stubHosts({
      'https://text.pollinations.ai': () => new Response('{}', { status: 402 }),
      'https://oai.endpoints.kepler.ai.cloud.ovh.net': () => sse('好呀。'),
    });
    try {
      await raceFreeLanes('s', userMsg, undefined, 64);
      const poll = FREE_RACERS.find((r) => r.id === 'pollinations')!;
      expect(racerCoolingDown(poll)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      resetRacerCooldowns();
    }
  });

  it('all hosts failing rejects, which is what drives the unchanged fallback', async () => {
    stubHosts({
      'https://text.pollinations.ai': () => new Response('{}', { status: 402 }),
      'https://oai.endpoints.kepler.ai.cloud.ovh.net': () => new Response('{}', { status: 429 }),
    });
    try {
      await expect(raceFreeLanes('s', userMsg, undefined, 64)).rejects.toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
      resetRacerCooldowns();
    }
  });

  it('when the fresh hosts die it borrows the longest-cooling host before giving up', async () => {
    // Pollinations is out of budget, so only OVHcloud is fresh this turn.
    const poll = FREE_RACERS.find((r) => r.id === 'pollinations')!;
    markRacerSent(poll.id);
    let pollAttempts = 0;
    stubHosts({
      'https://text.pollinations.ai': () => {
        pollAttempts += 1;
        return sse('备用线路答到喇。');
      },
      'https://oai.endpoints.kepler.ai.cloud.ovh.net': () => new Response('{}', { status: 429 }),
    });
    try {
      const text = await raceFreeLanes('s', userMsg, undefined, 64);
      // OVH was rate-limited, so the cooling Pollinations host answered
      expect(pollAttempts).toBe(1);
      expect(text.trim().length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
      resetRacerCooldowns();
    }
  });
});

describe('clientChat keeps its old last resort when every host fails', () => {
  beforeEach(() => { resetRacerCooldowns(); });
  afterAll(() => { vi.unstubAllGlobals(); resetRacerCooldowns(); });

  it('answers from the local lane, in her language, ending with a question', async () => {
    // exactly the pre-change behaviour: no key stored, every free host dead
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const r = await clientChat([{ role: 'user', content: '今日好開心呀' }], { language: 'yue' });
    expect(r.reply.length).toBeGreaterThan(4);
    expect(r.reply.trim().endsWith('？') || r.reply.trim().endsWith('?')).toBe(true);
    expect(r.emotionHints).toBeDefined();
  });

  it('still prefers the live facts line when one was fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const r = await clientChat(
      [{ role: 'user', content: 'here?' }],
      { language: 'en', worldSpoken: 'It is 29 degrees and drizzling in Hong Kong.' },
    );
    expect(r.reply).toContain('29 degrees');
  });
});
