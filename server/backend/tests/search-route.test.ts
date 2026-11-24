import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { createBackend, type Backend } from '../src/http.js';
import { openDb } from '../src/db.js';
import { _resetRateLimitsForTests } from '../src/security.js';
import {
  SEARCH_ROUTE,
  SEARCH_SOFT_DELAY_MS,
  DEFAULT_MAX_SEARCHES_PER_WINDOW,
  readSearchLimits,
} from '../src/admin-limits.js';
import { bucketKey, readCircuitBreaker, setCircuitBreaker } from '../src/rate-limit.js';
import { rateLimitStoreFor } from '../src/rate-limit-sqlite.js';

const ADMIN_TOKEN = 'test-admin-token-0123456789abcdef';
const T0 = 1_700_000_000_000; // 2023-11-14T22:13:20Z, inside one UTC day + window

const open: DatabaseSync[] = [];
const dirs: string[] = [];
let previousToken: string | undefined;

beforeEach(() => {
  previousToken = process.env.AMOJI_ADMIN_TOKEN;
  process.env.AMOJI_ADMIN_TOKEN = ADMIN_TOKEN;
  delete process.env.AMOJI_CORS_ORIGIN;
  _resetRateLimitsForTests();
});

afterEach(() => {
  for (const db of open) {
    try { db.close(); } catch { /* already closed */ }
  }
  open.length = 0;
  for (const dir of dirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  dirs.length = 0;
  if (previousToken === undefined) delete process.env.AMOJI_ADMIN_TOKEN;
  else process.env.AMOJI_ADMIN_TOKEN = previousToken;
});

function app(now: () => number = () => T0): { api: Backend; db: DatabaseSync } {
  const db = openDb(':memory:');
  open.push(db);
  const api = createBackend({ db, now, llm: 'offline', synthesize: async () => new Uint8Array([0]) });
  return { api, db };
}

function adminPut(api: Backend, body: unknown): Promise<Response> {
  return api.handle(new Request('http://amoji.local/api/admin/limits', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify(body),
  }));
}

function search(api: Backend, q = 'lofi'): Promise<Response> {
  return api.handle(new Request('http://amoji.local/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q }),
  }));
}

function quota(api: Backend): Promise<Response> {
  return api.handle(new Request('http://amoji.local/api/search/quota'));
}

describe('POST /api/search breaker semantics', () => {
  it('hard refuses with 429 + positive retryAfterMs and burns no token', async () => {
    const { api, db } = app();
    expect((await adminPut(api, { breaker: 'hard' })).status).toBe(200);

    const res = await search(api);
    expect(res.status).toBe(429);
    const body = await res.json() as {
      error: string;
      reason: string;
      breaker: string;
      retryAfterMs: number;
      quota: { limit: number; remaining: number; breaker: string };
    };
    expect(body).toMatchObject({ error: 'rate limited', reason: 'hard', breaker: 'hard' });
    expect(body.retryAfterMs).toBeGreaterThan(0);
    expect(body.quota.breaker).toBe('hard');

    // The persisted bucket still holds a full budget — a refusal is not a spend.
    const bucket = rateLimitStoreFor(db).getBucket(bucketKey(SEARCH_ROUTE, 'local'));
    expect(bucket?.tokens).toBe(DEFAULT_MAX_SEARCHES_PER_WINDOW);

    // Reopen the breaker: the whole budget is still available.
    expect((await adminPut(api, { breaker: 'closed' })).status).toBe(200);
    for (let i = 0; i < DEFAULT_MAX_SEARCHES_PER_WINDOW; i += 1) {
      expect((await search(api)).status).toBe(200);
    }
    expect((await search(api)).status).toBe(429);
  });

  it('soft allows and reports the spoken delay', async () => {
    const { api } = app();
    expect((await adminPut(api, { breaker: 'soft' })).status).toBe(200);

    const res = await search(api);
    expect(res.status).toBe(200);
    const body = await res.json() as {
      ok: boolean;
      delayMs: number;
      retryAfterMs: number;
      tracks: unknown[];
      upstream: string;
      quota: { breaker: string; allowed: boolean; reason: string };
    };
    expect(body.ok).toBe(true);
    expect(body.delayMs).toBe(SEARCH_SOFT_DELAY_MS);
    expect(body.retryAfterMs).toBe(SEARCH_SOFT_DELAY_MS);
    expect(body.tracks).toEqual([]);
    expect(body.upstream).toBe('not_configured');
    expect(body.quota).toMatchObject({ breaker: 'soft', allowed: true, reason: 'soft' });
  });

  it('closed uses the ordinary bucket and refuses when it is empty', async () => {
    const { api } = app();
    expect((await adminPut(api, { maxSearchesPerWindow: 2 })).status).toBe(200);

    expect((await search(api)).status).toBe(200);
    expect((await search(api)).status).toBe(200);
    const refused = await search(api);
    expect(refused.status).toBe(429);
    const body = await refused.json() as { reason: string; retryAfterMs: number };
    expect(body.reason).toBe('bucket');
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });

  it('rejects a search with no query without consuming a token', async () => {
    const { api } = app();
    const empty = await search(api, '   ');
    expect(empty.status).toBe(400);
    const after = await quota(api);
    const body = await after.json() as { remaining: number };
    expect(body.remaining).toBe(DEFAULT_MAX_SEARCHES_PER_WINDOW);
  });

  it('a cap of 0 refuses every API search without touching a bucket', async () => {
    const { api } = app();
    expect((await adminPut(api, { maxSearchesPerWindow: 0 })).status).toBe(200);

    const res = await search(api);
    expect(res.status).toBe(429);
    const body = await res.json() as { reason: string; retryAfterMs: number; quota: { limit: number } };
    expect(body.reason).toBe('bucket');
    expect(body.retryAfterMs).toBeGreaterThan(0);
    expect(body.quota.limit).toBe(0);

    const preview = await quota(api);
    const previewBody = await preview.json() as { allowed: boolean; limit: number; retryAfterMs: number };
    expect(previewBody.allowed).toBe(false);
    expect(previewBody.limit).toBe(0);
    expect(previewBody.retryAfterMs).toBeGreaterThan(0);
  });

  it('GET /api/search/quota is read-only and mirrors the next decision', async () => {
    const { api } = app();
    const before = await quota(api);
    const beforeBody = await before.json() as { allowed: boolean; remaining: number };
    expect(beforeBody.allowed).toBe(true);
    expect(beforeBody.remaining).toBe(DEFAULT_MAX_SEARCHES_PER_WINDOW);

    await search(api);
    const after = await quota(api);
    const afterBody = await after.json() as { allowed: boolean; remaining: number };
    expect(afterBody.remaining).toBe(DEFAULT_MAX_SEARCHES_PER_WINDOW - 1);

    // Polling the quota must not spend anything.
    await quota(api);
    await quota(api);
    const again = await quota(api);
    expect((await again.json() as { remaining: number }).remaining).toBe(DEFAULT_MAX_SEARCHES_PER_WINDOW - 1);
  });
});

describe('one source of truth: admin PUT -> consumeRateLimit', () => {
  it('the admin cap written by PUT is the cap the search route enforces', async () => {
    const { api, db } = app();
    expect((await adminPut(api, { maxSearchesPerWindow: 4 })).status).toBe(200);
    expect(readSearchLimits(db, T0).maxSearchesPerWindow).toBe(4);

    for (let i = 0; i < 4; i += 1) expect((await search(api)).status).toBe(200);
    expect((await search(api)).status).toBe(429);
  });

  it('the admin breaker written by PUT is the breaker consumeRateLimit reads', async () => {
    const { api, db } = app();
    await adminPut(api, { breaker: 'hard' });
    // Direct engine read, not an HTTP echo.
    expect(readCircuitBreaker(rateLimitStoreFor(db)).state).toBe('hard');
    expect((await search(api)).status).toBe(429);
  });

  it('migrates a legacy admin_settings breaker into the shared store once', async () => {
    const db = openDb(':memory:');
    open.push(db);
    db.exec(`
      CREATE TABLE admin_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
      INSERT INTO admin_settings (key, value, updated_at) VALUES ('search.breaker', 'hard', ${T0 - 5000});
    `);
    const api = createBackend({ db, now: () => T0, llm: 'offline', synthesize: async () => new Uint8Array([0]) });

    expect(readSearchLimits(db, T0).breaker).toBe('hard');
    expect(readCircuitBreaker(rateLimitStoreFor(db)).state).toBe('hard');
    expect(readCircuitBreaker(rateLimitStoreFor(db)).changedBy).toBe('migration');
    expect((await search(api)).status).toBe(429);
  });
});

describe('sqlite rate-limit store durability', () => {
  // Opening/closing a sqlite file twice is disk-bound; 5 s flakes on a loaded
  // Windows machine (observed), so this I/O test gets its own budget.
  it('persists breaker transitions across a store reopen', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'amoji-rl-'));
    dirs.push(dir);
    const path = join(dir, 'rl.sqlite');

    const first = openDb(path);
    const storeA = rateLimitStoreFor(first);
    setCircuitBreaker(storeA, 'soft', { now: T0, changedBy: 'owner' });
    first.close();

    const second = openDb(path);
    open.push(second);
    const reopened = readCircuitBreaker(rateLimitStoreFor(second));
    expect(reopened.state).toBe('soft');
    expect(reopened.changedBy).toBe('owner');
    expect(reopened.changedAt).toBe(T0);
  }, 20_000);

  it('counts today and the current window for the admin warnings', async () => {
    let clock = T0;
    const { api } = app(() => clock);
    await adminPut(api, { maxSearchesPerWindow: 2 });

    await search(api);
    clock = T0 + 1_000;
    await search(api);

    const warnings = await api.handle(new Request('http://amoji.local/api/admin/warnings', {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    }));
    const body = await warnings.json() as {
      searchUsage: {
        searchesToday: number;
        searchesThisWindow: number;
        maxSearchesPerWindow: number;
        windowUtilisation: number;
        breaker: string;
      };
      warnings: Array<{ id: string; severity: string }>;
    };
    expect(body.searchUsage).toMatchObject({
      searchesToday: 2,
      searchesThisWindow: 2,
      maxSearchesPerWindow: 2,
      windowUtilisation: 1,
      breaker: 'closed',
    });
    expect(body.warnings.map((w) => w.id)).toContain('search_volume_at_limit');
  });
});
