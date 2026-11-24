import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginSearch, searchGateConfigured, SEARCH_GATE_TIMEOUT_MS } from '../lib/search-gate';
import { createSearchBudget, memorySearchBudgetStorage } from '../lib/search-budget';
import { SEARCH_DELAY_LINES } from '../lib/fillers';

const T0 = 1_700_000_000_000;
const ENV_KEY = 'NEXT_PUBLIC_AMOJI_API';

function budgetWithSoftHard(softMax: number, hardMax: number) {
  let now = T0;
  return {
    budget: createSearchBudget({
      config: { windowMs: 60_000, softMax, hardMax, softDelayMs: 2_500 },
      storage: memorySearchBudgetStorage(),
      now: () => now,
    }),
    advance(ms: number) {
      now += ms;
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  delete process.env[ENV_KEY];
});

afterEach(() => {
  delete process.env[ENV_KEY];
  vi.unstubAllGlobals();
});

describe('search gate without an API origin (GitHub Pages build)', () => {
  it('is a no-op: no fetch, no budget write, no delay, curated lane', async () => {
    const { budget } = budgetWithSoftHard(2, 3);
    const fetchImpl = vi.fn();
    const speak = vi.fn();
    const sleep = vi.fn();

    expect(searchGateConfigured()).toBe(false);
    const gate = await beginSearch('play some jazz', {
      lang: 'en',
      budget,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      speak,
      sleep,
    });

    expect(gate.mode).toBe('off');
    expect(gate.lane).toBe('curated');
    expect(gate.proceed).toBe(false);
    expect(gate.delayMs).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
    // Advisory budget is untouched when the lane is off.
    expect(budget.used()).toBe(0);
  });
});

describe('search gate with an API origin', () => {
  beforeEach(() => {
    process.env[ENV_KEY] = 'https://api.example.test/';
  });

  it('falls back to the curated list when the server breaker is hard', async () => {
    const { budget } = budgetWithSoftHard(20, 30);
    const called: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      called.push(String(input));
      return jsonResponse({
        error: 'rate limited',
        reason: 'hard',
        breaker: 'hard',
        retryAfterMs: 987_654,
        quota: { breaker: 'hard', allowed: false, reason: 'hard', limit: 30, remaining: 30, used: 0, resetAt: T0 + 987_654, retryAfterMs: 987_654, delayMs: 0 },
      }, 429);
    });

    const gate = await beginSearch('lofi', {
      lang: 'en',
      budget,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(gate.mode).toBe('hard');
    expect(gate.lane).toBe('curated');
    expect(gate.proceed).toBe(false);
    expect(gate.retryAfterMs).toBeGreaterThan(0);
    expect(gate.quota?.breaker).toBe('hard');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('https://api.example.test/api/search');
  });

  it('refuses the API lane when the bucket is empty but the breaker is closed', async () => {
    const { budget } = budgetWithSoftHard(20, 30);
    const fetchImpl = vi.fn(async () => jsonResponse({
      error: 'rate limited',
      reason: 'bucket',
      breaker: 'closed',
      retryAfterMs: 4_000,
    }, 429));

    const gate = await beginSearch('lofi', { lang: 'en', budget, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(gate.mode).toBe('refused');
    expect(gate.lane).toBe('curated');
    expect(gate.proceed).toBe(false);
    expect(gate.retryAfterMs).toBe(4_000);
  });

  it('soft: speaks the long filler line, waits delayMs, then allows', async () => {
    const { budget } = budgetWithSoftHard(20, 30);
    const fetchImpl = vi.fn(async () => jsonResponse({
      ok: true,
      tracks: [],
      upstream: 'not_configured',
      delayMs: 2_500,
      retryAfterMs: 2_500,
      quota: { breaker: 'soft', allowed: true, reason: 'soft', limit: 30, remaining: 29, used: 1, resetAt: T0, retryAfterMs: 2_500, delayMs: 2_500, windowSeconds: 3_600 },
    }));
    const speak = vi.fn();
    const sleep = vi.fn(async () => undefined);

    const gate = await beginSearch('play a song', {
      lang: 'en',
      budget,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      speak,
      sleep,
    });

    expect(gate.mode).toBe('soft');
    expect(gate.lane).toBe('api');
    expect(gate.proceed).toBe(true);
    expect(gate.delayMs).toBe(2_500);
    expect(sleep).toHaveBeenCalledWith(2_500);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0]?.[0]).toBe(gate.fillerLine);
    expect(gate.fillerLine).toBe(SEARCH_DELAY_LINES.en[0]);
    expect(gate.fillerLine.length).toBeGreaterThan(40);
  });

  it('soft in the local budget also delays when the server says zero', async () => {
    const { budget } = budgetWithSoftHard(1, 30);
    budget.take(); // used = 1 → local tier soft from here on
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true, tracks: [], delayMs: 0 }));
    const sleep = vi.fn(async () => undefined);

    const gate = await beginSearch('jazz', { lang: 'yue', budget, fetchImpl: fetchImpl as unknown as typeof fetch, sleep });
    expect(gate.mode).toBe('soft');
    expect(gate.delayMs).toBe(2_500);
    expect(sleep).toHaveBeenCalledWith(2_500);
    expect(gate.fillerLine).toBe(SEARCH_DELAY_LINES.yue[0]);
  });

  it('local hard never calls the server and falls back to curated', async () => {
    const { budget } = budgetWithSoftHard(1, 1);
    budget.take(); // used = 1 → hard
    const fetchImpl = vi.fn();

    const gate = await beginSearch('jazz', { lang: 'en', budget, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(gate.mode).toBe('hard');
    expect(gate.source).toBe('budget');
    expect(gate.lane).toBe('curated');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(gate.retryAfterMs).toBeGreaterThan(0);
  });

  it('a dead backend degrades to allowed, never to an error state', async () => {
    const { budget } = budgetWithSoftHard(20, 30);
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });

    const gate = await beginSearch('jazz', { lang: 'en', budget, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(gate.mode).toBe('error');
    expect(gate.lane).toBe('api');
    expect(gate.proceed).toBe(true);
  });

  it('a 5xx does not punish the user', async () => {
    const { budget } = budgetWithSoftHard(20, 30);
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'boom' }, 500));
    const gate = await beginSearch('jazz', { lang: 'en', budget, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(gate.mode).toBe('error');
    expect(gate.lane).toBe('api');
    expect(gate.proceed).toBe(true);
  });

  it('a healthy gate allows the API lane', async () => {
    const { budget } = budgetWithSoftHard(20, 30);
    const fetchImpl = vi.fn(async () => jsonResponse({
      ok: true,
      tracks: [],
      delayMs: 0,
      retryAfterMs: 0,
      quota: { breaker: 'closed', allowed: true, reason: 'ok', limit: 30, remaining: 29, used: 1, resetAt: T0, retryAfterMs: 0, delayMs: 0 },
    }));
    const gate = await beginSearch('jazz', { lang: 'en', budget, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(gate.mode).toBe('ok');
    expect(gate.lane).toBe('api');
    expect(gate.proceed).toBe(true);
    expect(gate.quota?.breaker).toBe('closed');
  });

  it('bounds the request with a timeout constant', () => {
    expect(SEARCH_GATE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SEARCH_GATE_TIMEOUT_MS).toBeLessThanOrEqual(8_000);
  });
});
