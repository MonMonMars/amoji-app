import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { createBackend, type Backend } from '../src/http.js';
import { openDb } from '../src/db.js';

const ADMIN_TOKEN = 'test-admin-token-0123456789abcdef';
const open: DatabaseSync[] = [];
const tempDirs: string[] = [];

let previousToken: string | undefined;
let previousCors: string | undefined;

beforeEach(() => {
  previousToken = process.env.AMOJI_ADMIN_TOKEN;
  previousCors = process.env.AMOJI_CORS_ORIGIN;
  process.env.AMOJI_ADMIN_TOKEN = ADMIN_TOKEN;
  delete process.env.AMOJI_CORS_ORIGIN;
});

afterEach(() => {
  for (const db of open) {
    try { db.close(); } catch { /* already closed */ }
  }
  open.length = 0;
  for (const dir of tempDirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  tempDirs.length = 0;
  if (previousToken === undefined) delete process.env.AMOJI_ADMIN_TOKEN;
  else process.env.AMOJI_ADMIN_TOKEN = previousToken;
  if (previousCors === undefined) delete process.env.AMOJI_CORS_ORIGIN;
  else process.env.AMOJI_CORS_ORIGIN = previousCors;
});

function app(now = () => 1_700_000_000_000): Backend {
  const db = openDb(':memory:');
  open.push(db);
  return createBackend({
    db,
    now,
    llm: 'offline',
    synthesize: async () => new Uint8Array([0]),
  });
}

function adminRequest(
  path: string,
  method = 'GET',
  token: string | null = ADMIN_TOKEN,
  body?: unknown,
): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return new Request(`http://amoji.local${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createUser(api: Backend): Promise<string> {
  const res = await api.handle(new Request('http://amoji.local/api/auth/session', {
    method: 'POST',
    body: '{}',
  }));
  expect(res.status).toBe(200);
  const body = await res.json() as { token: string };
  return body.token;
}

function collectKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, out);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out.add(key);
      collectKeys(child, out);
    }
  }
  return out;
}

describe('admin api', () => {
  it('answers 503 with a clear warning when AMOJI_ADMIN_TOKEN is unset', async () => {
    delete process.env.AMOJI_ADMIN_TOKEN;
    const res = await app().handle(adminRequest('/api/admin/stats'));
    expect(res.status).toBe(503);
    const body = await res.json() as {
      code: string;
      warnings: Array<{ id: string; severity: string }>;
    };
    expect(body.code).toBe('admin_disabled');
    expect(body.warnings[0]).toMatchObject({ id: 'admin_token_missing', severity: 'error' });
  });

  it('rejects a missing or wrong token with 401', async () => {
    const api = app();
    const missing = await api.handle(adminRequest('/api/admin/stats', 'GET', null));
    expect(missing.status).toBe(401);
    const wrong = await api.handle(adminRequest('/api/admin/stats', 'GET', 'not-the-token'));
    expect(wrong.status).toBe(401);
    const body = await wrong.json() as Record<string, unknown>;
    expect(body).toEqual({ error: 'unauthorized', code: 'admin_unauthorized' });
  });

  it('serves aggregate stats for a valid token', async () => {
    const api = app();
    await createUser(api);
    await createUser(api);
    const res = await api.handle(adminRequest('/api/admin/stats'));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      totalUsers: number;
      activeSessions: number;
      plans: { free: number; plus: number };
      search: { breaker: string; maxSearchesPerWindow: number };
    };
    expect(body.totalUsers).toBe(2);
    expect(body.activeSessions).toBe(2);
    expect(body.plans).toEqual({ free: 2, plus: 0 });
    expect(body.search.breaker).toBe('closed');
    expect(body.search.maxSearchesPerWindow).toBe(30);
  });

  it('lists users with pagination and never leaks session tokens or hashes', async () => {
    const api = app();
    const tokenA = await createUser(api);
    const tokenB = await createUser(api);

    const res = await api.handle(adminRequest('/api/admin/users?limit=50&offset=0'));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      total: number;
      users: Array<Record<string, unknown>>;
    };
    expect(body.total).toBe(2);
    expect(body.users).toHaveLength(2);
    for (const user of body.users) {
      expect(typeof user.id).toBe('string');
      expect(typeof user.createdAt).toBe('number');
      expect(['free', 'plus']).toContain(user.plan);
    }

    const wire = JSON.stringify(body);
    expect(wire).not.toContain(tokenA);
    expect(wire).not.toContain(tokenB);
    const keys = collectKeys(body);
    for (const key of keys) {
      expect(key).not.toMatch(/token|password|hash|secret/i);
    }

    const page = await api.handle(adminRequest('/api/admin/users?limit=1&offset=1'));
    const pageBody = await page.json() as { users: Array<{ id: string }> };
    expect(pageBody.users).toHaveLength(1);
    expect(pageBody.users[0]?.id).not.toBe(body.users[0]?.id);
  });

  it('inspects one user without exposing tokens, and 404s an unknown id', async () => {
    const api = app();
    const token = await createUser(api);
    const list = await api.handle(adminRequest('/api/admin/users'));
    const listBody = await list.json() as { users: Array<{ id: string }> };
    const id = listBody.users[0]?.id ?? '';
    const res = await api.handle(adminRequest(`/api/admin/users/${id}`));
    expect(res.status).toBe(200);
    const detail = await res.json() as {
      sessions: Array<Record<string, unknown>>;
      user: { id: string };
    };
    expect(detail.user.id).toBe(id);
    expect(detail.sessions.length).toBe(1);
    expect(detail.sessions[0]).not.toHaveProperty('token');
    expect(JSON.stringify(detail)).not.toContain(token);

    const missing = await api.handle(adminRequest('/api/admin/users/does-not-exist'));
    expect(missing.status).toBe(404);
  });

  it('revokes every session for one user and leaves other users alone', async () => {
    const api = app();
    const victim = await createUser(api);
    const bystander = await createUser(api);
    const list = await api.handle(adminRequest('/api/admin/users'));
    const listBody = await list.json() as { users: Array<{ id: string }> };
    const victimId = listBody.users[0]?.id;
    expect(victimId).toBeTruthy();

    const revoke = await api.handle(adminRequest(`/api/admin/users/${victimId}/revoke-sessions`, 'POST'));
    expect(revoke.status).toBe(200);
    const revoked = await revoke.json() as { revoked: number };
    expect(revoked.revoked).toBe(1);

    const dead = await api.handle(new Request('http://amoji.local/api/state', {
      headers: { authorization: `Bearer ${victim}` },
    }));
    expect(dead.status).toBe(401);

    const alive = await api.handle(new Request('http://amoji.local/api/state', {
      headers: { authorization: `Bearer ${bystander}` },
    }));
    expect(alive.status).toBe(200);
  });

  it('persists breaker state and the search cap across a database reopen', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'amoji-admin-'));
    tempDirs.push(dir);
    const dbPath = join(dir, 'admin.sqlite');

    const db = openDb(dbPath);
    const api = createBackend({ db, llm: 'offline', synthesize: async () => new Uint8Array([0]) });
    const put = await api.handle(adminRequest('/api/admin/limits', 'PUT', ADMIN_TOKEN, {
      breaker: 'hard',
      maxSearchesPerWindow: 7,
    }));
    expect(put.status).toBe(200);
    const afterPut = await put.json() as {
      limits: { breaker: string; maxSearchesPerWindow: number };
      history: Array<{ kind: string }>;
    };
    expect(afterPut.limits).toMatchObject({ breaker: 'hard', maxSearchesPerWindow: 7 });
    expect(afterPut.history[0]?.kind).toBe('limits.update');
    db.close();

    const reopened = openDb(dbPath);
    open.push(reopened);
    const api2 = createBackend({ db: reopened, llm: 'offline', synthesize: async () => new Uint8Array([0]) });
    const get = await api2.handle(adminRequest('/api/admin/limits'));
    expect(get.status).toBe(200);
    const body = await get.json() as { limits: { breaker: string; maxSearchesPerWindow: number } };
    expect(body.limits).toMatchObject({ breaker: 'hard', maxSearchesPerWindow: 7 });
  }, 20_000); // disk-bound sqlite reopen; 5 s flakes on a loaded Windows box

  it('rejects an invalid breaker or cap without changing state', async () => {
    const api = app();
    const badBreaker = await api.handle(adminRequest('/api/admin/limits', 'PUT', ADMIN_TOKEN, {
      breaker: 'open',
    }));
    expect(badBreaker.status).toBe(400);
    const badCap = await api.handle(adminRequest('/api/admin/limits', 'PUT', ADMIN_TOKEN, {
      maxSearchesPerWindow: -1,
    }));
    expect(badCap.status).toBe(400);
    const empty = await api.handle(adminRequest('/api/admin/limits', 'PUT', ADMIN_TOKEN, {}));
    expect(empty.status).toBe(400);

    const get = await api.handle(adminRequest('/api/admin/limits'));
    const body = await get.json() as { limits: { breaker: string; maxSearchesPerWindow: number } };
    expect(body.limits).toMatchObject({ breaker: 'closed', maxSearchesPerWindow: 30 });
  });

  it('surfaces breaker, mail, and CORS warnings', async () => {
    const api = app();
    await api.handle(adminRequest('/api/admin/limits', 'PUT', ADMIN_TOKEN, { breaker: 'soft' }));
    const res = await api.handle(adminRequest('/api/admin/warnings'));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      ok: boolean;
      status: string;
      warnings: Array<{ id: string; severity: string }>;
    };
    const ids = body.warnings.map((w) => w.id);
    expect(ids).toContain('breaker_soft');
    expect(ids).toContain('mail_not_configured');
    expect(ids).toContain('cors_open');
    expect(body.status).toBe('ok');
    expect(body.ok).toBe(true);
  });
});
