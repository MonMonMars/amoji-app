// r2026-11-08.142 — the free lane races HOSTS, not aliases of one model.
// r2026-11-08.143 — corrected: OVH meters quota per (IP, MODEL), so OVH is
// expanded into one racer per verified model and the cooldown is keyed by
// (host, model) rather than by host. Pollinations is a second QUOTA on OVH's
// upstream, not a second company — Puter is the only independent third.
//
// These tests pin: distinct budget slots (never the same host::model twice),
// the rotation (a second message inside 30s still reaches OVH on a DIFFERENT
// model), the two OVH traps (no Authorization header, no reasoning_effort),
// and a fallback that behaves exactly as it did before.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FREE_RACERS, OVH_MODELS, OVH_MODEL, POLLINATIONS_MODEL, RACERS_PER_TURN,
  RACER_COOLDOWN_MS, clientChat, eligibleRacers, markRacerSent, racerCoolingDown,
  racerKey, raceFreeLanes, resetRacerCooldowns, selectRacers,
} from '../lib/client-chat';
import type { ChatMessage } from '../lib/llm';

const userMsg: ChatMessage[] = [{ role: 'user', content: '今日返工好攰呀' }];

const OVH = 'https://oai.endpoints.kepler.ai.cloud.ovh.net';
const POLL = 'https://text.pollinations.ai';

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

/** A fetch stub that answers per origin prefix and records what was sent. */
function stubHosts(answers: Record<string, () => Response | Promise<Response>>) {
  const calls: Array<{ url: string; body: string; headers: Record<string, string> }> = [];
  const fetchStub = vi.fn(async (input: unknown, init?: { body?: unknown; headers?: Record<string, string> }) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? ''), headers: init?.headers ?? {} });
    const host = Object.keys(answers).find((h) => url.startsWith(h));
    if (!host) throw new Error(`unstubbed host: ${url}`);
    return answers[host]!();
  });
  vi.stubGlobal('fetch', fetchStub);
  return { calls, fetchStub };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ovhRacers = () => FREE_RACERS.filter((r) => r.host === 'ovhcloud');
const bodyOf = (spec: (typeof FREE_RACERS)[number]) => {
  const req = spec.buildRequest({ system: 's', messages: userMsg, maxTokens: 100 });
  if (req.transport !== 'http') throw new Error('expected http');
  return req;
};

describe('every racer is its own budget slot', () => {
  it('spans more than one host', () => {
    const hosts = new Set(FREE_RACERS.map((r) => r.host));
    expect(hosts.size).toBeGreaterThanOrEqual(2);
    expect([...hosts]).toEqual(expect.arrayContaining(['pollinations', 'ovhcloud', 'puter']));
  });

  it('never sends the same host+model pair twice', () => {
    // host::model IS the quota key, so a duplicate would spend one budget
    // twice for zero diversity — exactly the r142 bug, one level down.
    const keys = FREE_RACERS.map(racerKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has unique racer ids (markRacerSent resolves ids to keys)', () => {
    const ids = FREE_RACERS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives each OVH model its own racer, all on the OVH origin', () => {
    const racers = ovhRacers();
    expect(racers.map((r) => r.model)).toEqual([...OVH_MODELS]);
    for (const r of racers) {
      expect(new URL(bodyOf(r).url).origin).toBe(OVH);
    }
  });

  it('leads with the Cantonese-quality model', () => {
    // Amoji is Cantonese-first: the 70B Llama is the model that produced
    // genuinely colloquial 囉/嘅/咁 lines in the probe, so it is first.
    expect(OVH_MODEL).toBe('Meta-Llama-3_3-70B-Instruct');
    expect(OVH_MODELS[0]).toBe(OVH_MODEL);
    expect(ovhRacers()[0]!.model).toBe(OVH_MODEL);
    // and the "no delta.content at all" reasoning-only models are never asked
    for (const dead of ['Qwen3.6-27B', 'Qwen3.5-9B', 'Qwen3.5-397B-A17B']) {
      expect(OVH_MODELS).not.toContain(dead);
    }
  });

  it('asks Pollinations exactly ONCE, under its one anonymous model', () => {
    const pollinations = FREE_RACERS.filter((r) => r.host === 'pollinations');
    expect(pollinations).toHaveLength(1);
    const req = bodyOf(pollinations[0]!);
    expect(req.url.startsWith(POLL)).toBe(true);
    expect((req.body as { model?: string }).model).toBe(POLLINATIONS_MODEL);
    // Pollinations' anonymous model is documented as "GPT-OSS 20B (OVH)", so
    // it is a second quota on OVH's upstream — not a second upstream. The
    // racer still earns its slot (separate queue, separate counter).
    expect(POLLINATIONS_MODEL).toBe('openai-fast');
  });

  it('keeps Puter as the only genuinely independent racer', () => {
    const puter = FREE_RACERS.filter((r) => r.host === 'puter');
    expect(puter).toHaveLength(1);
    expect(puter[0]!.buildRequest({ system: 's', messages: userMsg, maxTokens: 100 }).transport).toBe('sdk');
    // no anonymous per-IP budget to protect
    expect(puter[0]!.cooldownMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The two OVH traps, guarded so a future refactor cannot reintroduce them.
// ---------------------------------------------------------------------------
describe('OVH trap guards', () => {
  it('never sends an Authorization header to OVH (a placeholder 403s)', () => {
    for (const spec of ovhRacers()) {
      const req = bodyOf(spec);
      const names = Object.keys(req.headers).map((h) => h.toLowerCase());
      // `Bearer no-key` measured 403 "authentication failed"; most OpenAI
      // SDKs inject a dummy key, so the field must be absent entirely —
      // absent, not empty.
      expect(names).not.toContain('authorization');
      expect(JSON.stringify(req.headers).toLowerCase()).not.toContain('bearer');
    }
  });

  it('never sends reasoning_effort to OVH (400: unsupported for most models)', () => {
    for (const spec of ovhRacers()) {
      const req = bodyOf(spec);
      expect('reasoning_effort' in req.body).toBe(false);
      // and it is not smuggled in as some other casing
      const keys = Object.keys(req.body).map((k) => k.toLowerCase());
      expect(keys).not.toContain('reasoning_effort');
      expect(JSON.stringify(req.body).toLowerCase()).not.toContain('reasoning_effort');
    }
  });

  it('still sends reasoning_effort to Pollinations, the one host that accepts it', () => {
    const poll = FREE_RACERS.find((r) => r.host === 'pollinations')!;
    expect(bodyOf(poll).body).toMatchObject({ reasoning_effort: 'low' });
  });

  it('no HTTP racer sends a bearer token at all — the whole lane is anonymous', () => {
    for (const spec of FREE_RACERS) {
      const req = spec.buildRequest({ system: 's', messages: userMsg, maxTokens: 100 });
      if (req.transport !== 'http') continue;
      expect(Object.keys(req.headers).map((h) => h.toLowerCase())).not.toContain('authorization');
      expect((req.body as { stream?: boolean }).stream).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-(host, model) cooldown = the rotation.
// ---------------------------------------------------------------------------
describe('the cooldown is per (host, model), not per host', () => {
  beforeEach(() => { resetRacerCooldowns(); });
  afterEach(() => { vi.unstubAllGlobals(); resetRacerCooldowns(); });

  it('suppresses a second Pollinations attempt inside the window', () => {
    const poll = FREE_RACERS.find((r) => r.id === 'pollinations')!;
    const t0 = 1_000_000;
    expect(racerCoolingDown(poll, t0)).toBe(false);
    markRacerSent(poll.id, t0);
    expect(racerCoolingDown(poll, t0)).toBe(true);
    expect(racerCoolingDown(poll, t0 + RACER_COOLDOWN_MS.pollinations - 1)).toBe(true);
    expect(racerCoolingDown(poll, t0 + RACER_COOLDOWN_MS.pollinations)).toBe(false);
  });

  it('does NOT cool OVH\'s other models when one model answers', () => {
    const t0 = 1_000_000;
    const [first, second, third] = ovhRacers();
    // OVH allows TWO dispatches per model per window, so spend both
    markRacerSent(first!.id, t0);
    markRacerSent(first!.id, t0 + 1_000);
    expect(racerCoolingDown(first!, t0 + 2_000)).toBe(true);
    // different model on the SAME host = a different quota: still fresh
    expect(racerCoolingDown(second!, t0 + 2_000)).toBe(false);
    expect(racerCoolingDown(third!, t0 + 2_000)).toBe(false);
  });

  it('allows the measured TWO dispatches per OVH model per window, then stops', () => {
    const t0 = 1_000_000;
    const model = ovhRacers()[0]!;
    expect(racerCoolingDown(model, t0)).toBe(false);
    markRacerSent(model.id, t0);
    // one spent, one left — this is the allowance the old 30s host gate lost
    expect(racerCoolingDown(model, t0 + 1_000)).toBe(false);
    markRacerSent(model.id, t0 + 1_000);
    expect(racerCoolingDown(model, t0 + 2_000)).toBe(true);
    // and the whole window still clears on schedule
    expect(racerCoolingDown(model, t0 + RACER_COOLDOWN_MS.ovhcloud)).toBe(false);
  });

  it('a 429 exhausts the slot at once instead of retrying into a second refusal', () => {
    const t0 = 1_000_000;
    const model = ovhRacers()[0]!;
    markRacerSent(model.id, t0, true);
    expect(racerCoolingDown(model, t0 + 1_000)).toBe(true);
    // and the sibling models are untouched by one model's refusal
    expect(racerCoolingDown(ovhRacers()[1]!, t0 + 1_000)).toBe(false);
  });

  it('a second message inside 30s still reaches OVH instead of being gated off', async () => {
    vi.stubGlobal('window', {
      puter: { ai: { chat: async () => (async function* () { yield { text: '我喺度。' }; })() } },
    });
    const { calls } = stubHosts({
      [POLL]: () => sse('第一句。'),
      [OVH]: () => sse('第二句。'),
    });
    const ovhModels = (from: number, to = calls.length) => calls.slice(from, to)
      .filter((c) => c.url.startsWith(OVH))
      .map((c) => (JSON.parse(c.body || '{}') as { model?: string }).model);

    await raceFreeLanes('s', userMsg, undefined, 64);
    const afterFirst = calls.length;
    expect(ovhModels(0, afterFirst).length).toBeGreaterThan(0);
    expect(calls.filter((c) => c.url.startsWith(POLL))).toHaveLength(1);

    // second message well inside every OVH window. The old per-host 30s gate
    // sent nothing here; the rotation must still answer through OVH.
    await raceFreeLanes('s', userMsg, undefined, 64);
    expect(ovhModels(afterFirst).length).toBeGreaterThan(0);
    // Pollinations is still skipped: its window really is per IP
    expect(calls.slice(afterFirst).filter((c) => c.url.startsWith(POLL))).toHaveLength(0);
  });

  it('cycles to the NEXT models once a turn has spent the fresh ones', async () => {
    vi.stubGlobal('window', {
      puter: { ai: { chat: async () => (async function* () { yield { text: '我喺度。' }; })() } },
    });
    const { calls } = stubHosts({
      [POLL]: () => sse('第一句。'),
      [OVH]: () => sse('第二句。'),
    });
    const perTurn: string[][] = [];
    for (let turn = 0; turn < 3; turn += 1) {
      const before = calls.length;
      await raceFreeLanes('s', userMsg, undefined, 64);
      perTurn.push(calls.slice(before)
        .filter((c) => c.url.startsWith(OVH))
        .map((c) => (JSON.parse(c.body || '{}') as { model?: string }).model ?? ''));
    }
    // every turn reached OVH, and the set of models moved on between turns
    expect(perTurn.every((m) => m.length > 0)).toBe(true);
    const firstSet = new Set(perTurn[0]);
    const later = perTurn.slice(1).flat();
    expect(later.some((m) => !firstSet.has(m!))).toBe(true);
  });

  it('cools each model independently and recovers when the window refills', () => {
    const t0 = 1_000_000;
    const racers = ovhRacers();
    racers.forEach((r, i) => {
      markRacerSent(r.id, t0 + i * 2_000);
      markRacerSent(r.id, t0 + i * 2_000);
    });
    // one turn took every OVH slot
    for (const r of racers) expect(racerCoolingDown(r, t0 + 500)).toBe(true);
    // once the oldest window closes, only that one is fresh again
    const recovered = racers.filter((r) => !racerCoolingDown(r, t0 + 25_500));
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.id).toBe(racers[0]!.id);
  });

  it('takes the freshest few slots per turn, so one turn cannot drain them all', () => {
    const picked = selectRacers(1_000_000);
    expect(picked).toHaveLength(RACERS_PER_TURN);
    expect(new Set(picked.map(racerKey)).size).toBe(RACERS_PER_TURN);
    // Puter is always in the round while fresh: it is the only racer an
    // OVH-side outage cannot take away together with Pollinations.
    expect(picked.map((r) => r.host)).toContain('puter');
  });

  it('a rotation burst answers more turns than one model could', async () => {
    vi.stubGlobal('window', {
      puter: { ai: { chat: async () => (async function* () { yield { text: '我喺度。' }; })() } },
    });
    const { calls } = stubHosts({
      [POLL]: () => sse('免費線路。'),
      [OVH]: () => sse('OVH 答到。'),
    });
    let ovhTurns = 0;
    for (let turn = 0; turn < 2; turn += 1) {
      const before = calls.length;
      await raceFreeLanes('s', userMsg, undefined, 64);
      if (calls.slice(before).some((c) => c.url.startsWith(OVH))) ovhTurns += 1;
    }
    // the old per-host 30s gate allowed OVH on turn 1 only
    expect(ovhTurns).toBe(2);
  });

  it('never dead-ends: an all-cooling burst still leaves a lane to answer', () => {
    const t0 = 1_000_000;
    for (const r of FREE_RACERS) markRacerSent(r.id, t0);
    const picked = selectRacers(t0 + 10);
    expect(picked.length).toBeGreaterThanOrEqual(1);
    // whatever it picks must be a real racer, never undefined
    for (const r of picked) expect(FREE_RACERS).toContain(r);
  });

  it('fills a burst with the models that were not just used', () => {
    const t0 = 1_000_000;
    // a turn spent both dispatches of the first two OVH models
    const [a, b] = ovhRacers();
    markRacerSent(a!.id, t0);
    markRacerSent(a!.id, t0);
    markRacerSent(b!.id, t0);
    markRacerSent(b!.id, t0);
    const picked = selectRacers(t0 + 1_000);
    const ovh = picked.filter((r) => r.host === 'ovhcloud').map((r) => r.model);
    // the third model is still fresh, so OVH is not dropped from the burst
    expect(ovh).toContain(OVH_MODELS[2]);
    expect(ovh).not.toContain(a!.model);
    expect(ovh).not.toContain(b!.model);
    expect(eligibleRacers(t0 + 1_000).length).toBe(FREE_RACERS.length - 2);
  });
});

describe('degrading cleanly across hosts', () => {
  beforeEach(() => { resetRacerCooldowns(); });
  afterEach(() => { vi.unstubAllGlobals(); resetRacerCooldowns(); });

  it('when one racer 429s the others still win the reply', async () => {
    stubHosts({
      [POLL]: () => new Response('{"error":"Payment Required"}', { status: 402 }),
      [OVH]: async () => {
        await wait(5);
        return sse('我陪你傾下啦，今日發生咩事？');
      },
    });
    const text = await raceFreeLanes('s', userMsg, undefined, 64);
    // whichever surviving lane wins, the reply must be real text — never an
    // error string and never empty
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).not.toMatch(/402|429|empty|failed/);
  });

  it('a 402 also restarts that slot\'s cooldown so the spent slot is not retried', async () => {
    stubHosts({
      [POLL]: () => new Response('{}', { status: 402 }),
      [OVH]: () => sse('好呀。'),
    });
    await raceFreeLanes('s', userMsg, undefined, 64);
    const poll = FREE_RACERS.find((r) => r.id === 'pollinations')!;
    expect(racerCoolingDown(poll)).toBe(true);
  });

  it('a 429 cools only the model that was rate-limited', async () => {
    stubHosts({
      [POLL]: () => new Response('{}', { status: 402 }),
      [OVH]: () => new Response('{}', { status: 429 }),
    });
    const used = selectRacers().filter((r) => r.host === 'ovhcloud');
    await expect(raceFreeLanes('s', userMsg, undefined, 64)).rejects.toBeTruthy();
    // the models this turn actually asked are cooling; the untouched sibling
    // (if any) is not
    for (const r of used) expect(racerCoolingDown(r)).toBe(true);
    for (const r of ovhRacers().filter((x) => !used.includes(x))) {
      expect(racerCoolingDown(r)).toBe(false);
    }
  });

  it('all slots failing rejects, which is what drives the unchanged fallback', async () => {
    stubHosts({
      [POLL]: () => new Response('{}', { status: 402 }),
      [OVH]: () => new Response('{}', { status: 429 }),
    });
    // Puter is in the round but there is no browser SDK here, so it fails too
    await expect(raceFreeLanes('s', userMsg, undefined, 64)).rejects.toBeTruthy();
  });

  it('when the fresh lanes die it borrows the longest-cooling one before giving up', async () => {
    // Burn every slot so nothing is fresh; OVH's first model has waited longest.
    for (const r of FREE_RACERS) {
      markRacerSent(r.id, 5_000);
      markRacerSent(r.id, 5_000);
    }
    markRacerSent('ovhcloud', 0);
    const { calls } = stubHosts({
      [POLL]: () => new Response('{}', { status: 402 }),
      [OVH]: () => sse('備用線路答到喇。'),
    });
    const text = await raceFreeLanes('s', userMsg, undefined, 64);
    // a burst that is entirely inside its windows still asks somebody —
    // silence is worse than one extra request
    expect(calls.some((c) => c.url.startsWith(OVH))).toBe(true);
    expect(text.trim()).toBe('備用線路答到喇。');
  });
});

describe('clientChat keeps its old last resort when every slot fails', () => {
  beforeEach(() => { resetRacerCooldowns(); });
  afterEach(() => { vi.unstubAllGlobals(); resetRacerCooldowns(); });

  it('answers from the local lane, in her language, ending with a question', async () => {
    // exactly the pre-change behaviour: no key stored, every free lane dead
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
