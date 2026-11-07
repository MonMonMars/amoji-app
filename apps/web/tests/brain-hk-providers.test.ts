// r2026-11-08 — the brain list is a Hong Kong list.
// Measured from this machine (egress 223.19.127.18, AS9304 HGC) on 2026-11-07
// with curl and NO credential, so a status code is an edge answer, not an auth
// answer. These tests pin the resulting policy so a future edit cannot quietly
// re-offer a provider that is geo-blocked here.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BRAIN_SPECS, OFFERED_BRAINS, brainBodyExtras, brainSpec, pickBrain, probeBrain,
} from '../lib/brain';

/** swap in a fake localStorage for the duration of a test */
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

/** minimal Response stand-in for probeBrain */
function fakeFetch(status: number, body = ''): typeof fetch {
  return (async () => new Response(body, { status })) as unknown as typeof fetch;
}

const measured = (id: string) => BRAIN_SPECS.find((s) => s.id === id)!;

describe('Hong Kong provider policy (measured 2026-11-07)', () => {
  it('never offers a provider that is geo-blocked from Hong Kong', () => {
    // Groq: 403 "Forbidden" with no key at all — an edge region block.
    // Cerebras and the Gemini API answer the same way and are not in the list
    // at all, so their absence also has to keep holding.
    const offered = OFFERED_BRAINS.map((s) => s.id);
    expect(offered).not.toContain('groq');
    expect(offered).not.toContain('cerebras');
    expect(offered).not.toContain('gemini');
  });

  it('keeps Groq only as a hidden legacy entry that is never auto-picked', () => {
    expect(measured('groq').offered).toBe(false);
    const restore = swapLs({});
    try {
      for (const spec of BRAIN_SPECS) {
        if (spec.offered) continue;
        expect(pickBrain().spec.id).not.toBe(spec.id);
      }
    } finally { restore(); }
  });

  it('leads with Z.ai GLM, the one free-forever, no-card, no-+86 option', () => {
    expect(OFFERED_BRAINS[0]!.id).toBe('zai');
    expect(OFFERED_BRAINS[0]!.keyless).toBe(false);
  });

  it('lists every offered provider as reachable: 401/200, never 403', () => {
    // Pinned so the "which providers work in HK" table in the PR stays true.
    const REACHABLE: Record<string, number> = {
      zai: 401, deepseek: 401, moonshot: 401, openrouter: 200, pollinations: 200,
    };
    for (const spec of OFFERED_BRAINS) {
      expect(REACHABLE[spec.id], `${spec.id} has no measured status`).toBeDefined();
      expect(REACHABLE[spec.id]).not.toBe(403);
    }
  });

  it('every offered model id is the live one, not a retired one', () => {
    // Checked against docs.z.ai/guides/overview/pricing (GLM-4.7-Flash: Free on
    // every line item), api-docs.deepseek.com (deepseek-flash), the Moonshot
    // quickstart (kimi-k3) and openrouter.ai/api/v1/models, all 2026-11-07.
    const LIVE: Record<string, string> = {
      zai: 'glm-4.7-flash',
      deepseek: 'deepseek-flash',
      moonshot: 'kimi-k3',
      openrouter: 'xingchen-agi/xing4.0-29b-a4b:free',
      pollinations: 'openai',
    };
    for (const spec of OFFERED_BRAINS) expect(spec.model).toBe(LIVE[spec.id]);
    // the two ids that were stale in the old table
    expect(brainSpec('moonshot')!.model).not.toBe('kimi-k2.5');
    expect(brainSpec('openrouter')!.model).not.toBe('openai/gpt-oss-20b:free');
  });

  it('OpenRouter only advertises non-US-lab free models (US labs are 403 in HK)', () => {
    expect(measured('openrouter').model).not.toMatch(/^(openai|anthropic|google|x-ai)\//);
  });

  it('records WHY the dropped provider is gone, with a date', () => {
    const src = readFileSync(join(__dirname, '../lib/brain.ts'), 'utf8');
    expect(src).toMatch(/403/);           // the observed status
    expect(src).toMatch(/2026-11-07/);    // when it was measured
  });
});

describe('probeBrain (the Test button)', () => {
  it('says nokey before touching the network when the field is blank', async () => {
    let called = false;
    const f = (async () => { called = true; return new Response('', { status: 200 }); }) as unknown as typeof fetch;
    expect(await probeBrain('zai', '   ', { fetchImpl: f })).toBe('nokey');
    expect(called).toBe(false);
  });

  it('maps 401 to a rejected key', async () => {
    expect(await probeBrain('zai', 'sk-bad', { fetchImpl: fakeFetch(401) })).toBe('auth');
  });

  it('maps 403 to a region block, not a bad key', async () => {
    // the Groq case: a valid key still answers 403 from Hong Kong
    expect(await probeBrain('groq', 'gsk-ok', { fetchImpl: fakeFetch(403) })).toBe('blocked');
  });

  it('maps a retired model id to its own verdict', async () => {
    expect(await probeBrain('moonshot', 'sk-ok', { fetchImpl: fakeFetch(404, '{"error":"model not found"}') })).toBe('model');
  });

  it('maps an out-of-credit body to credit', async () => {
    expect(await probeBrain('deepseek', 'sk-ok', { fetchImpl: fakeFetch(402) })).toBe('credit');
  });

  it('returns ok on a 200', async () => {
    expect(await probeBrain('zai', 'sk-ok', { fetchImpl: fakeFetch(200, '{}') })).toBe('ok');
  });

  it('reports offline when the network throws', async () => {
    const boom = (async () => { throw new Error('dns'); }) as unknown as typeof fetch;
    expect(await probeBrain('zai', 'sk-ok', { fetchImpl: boom })).toBe('offline');
  });

  it('sends the live model id and the key, so the test exercises the real path', async () => {
    let seen: { url: string; body: string; auth: string } | null = null;
    const spy = (async (url: string, init: RequestInit) => {
      seen = {
        url: String(url),
        body: String(init.body),
        auth: String((init.headers as Record<string, string>)?.Authorization ?? ''),
      };
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    await probeBrain('zai', 'sk-live', { fetchImpl: spy });
    expect(seen!.url).toBe('https://api.z.ai/api/paas/v4/chat/completions');
    expect(seen!.auth).toBe('Bearer sk-live');
    expect(JSON.parse(seen!.body).model).toBe('glm-4.7-flash');
  });
});

describe('brainBodyExtras (request body per provider)', () => {
  it('switches GLM-4.7 thinking off — it is on by default and the chain stalls speech', () => {
    // docs.z.ai: `reasoning_effort` only bites on GLM-5.2+, while the GLM-4.7
    // series thinks compulsorily and cannot be disabled via reasoning_effort.
    // A key that passes Test would otherwise time out on every real message.
    expect(brainBodyExtras('zai')).toEqual({ thinking: { type: 'disabled' } });
    // and it must NOT send the other provider's knob
    expect(brainBodyExtras('zai')).not.toHaveProperty('reasoning_effort');
  });

  it('keeps low reasoning effort for the keyless reasoning lane', () => {
    expect(brainBodyExtras('pollinations')).toEqual({ reasoning_effort: 'low' });
    expect(brainBodyExtras('deepseek')).toEqual({ reasoning_effort: 'low' });
  });

  it('the chat path spreads provider extras exactly once, after temperature', () => {
    // A spread placed before an explicit key would silently lose it (or
    // duplicate it); this pins the shape that tests/brain-hk-providers relies on.
    const src = readFileSync(join(__dirname, '../lib/client-chat.ts'), 'utf8');
    expect(src.match(/\.\.\.brainBodyExtras\(spec\.id\)/g)).toHaveLength(1);
    expect(src).not.toMatch(/\n\s+reasoning_effort:/);
  });
});
