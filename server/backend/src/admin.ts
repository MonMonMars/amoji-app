/**
 * Single-operator admin API for the Amoji backend.
 *
 * Auth is one shared token (`AMOJI_ADMIN_TOKEN`) sent as
 * `Authorization: Bearer <token>`. There are no accounts or roles: the owner is
 * one person. Comparisons are timing-safe (HMAC-SHA256 digests + timingSafeEqual,
 * the same style as `billing.ts`). If the env var is unset every admin route
 * answers 503 instead of silently allowing access.
 *
 * Privacy rules enforced here:
 *   - no password hashes exist in this schema, and none are returned
 *   - session tokens are never returned (only counts and expiry times)
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { readEntitlement, stripeConfigured, billingDemoMode } from './billing.js';
import { mailConfigured } from './email.js';
import { readState } from './state.js';
import {
  ensureAdminTables,
  isBreakerMode,
  isSearchCap,
  listAdminEvents,
  readSearchLimits,
  readSearchUsage,
  writeSearchLimits,
  type BreakerMode,
  type SearchLimits,
  type SearchLimitsPatch,
} from './admin-limits.js';

export interface AdminResult {
  status: number;
  body: unknown;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 16_384;
const ADMIN_HEADER_HMAC_KEY = 'amoji-admin-token-compare-v1';

const LLM_KEY_ENVS = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'GITHUB_TOKEN',
  'MOONSHOT_API_KEY',
] as const;

export function adminToken(): string {
  return (process.env.AMOJI_ADMIN_TOKEN ?? '').trim();
}

export function adminEnabled(): boolean {
  return adminToken().length > 0;
}

/** Fixed-length digests make timingSafeEqual safe for tokens of any length. */
function tokensMatch(provided: string, expected: string): boolean {
  const a = createHmac('sha256', ADMIN_HEADER_HMAC_KEY).update(provided, 'utf8').digest();
  const b = createHmac('sha256', ADMIN_HEADER_HMAC_KEY).update(expected, 'utf8').digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearerToken(req: Request): string | undefined {
  const header = (req.headers.get('authorization') ?? '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || undefined;
}

function disabledBody(): Record<string, unknown> {
  return {
    error: 'admin disabled',
    code: 'admin_disabled',
    detail: 'Set AMOJI_ADMIN_TOKEN on the server to enable /api/admin/*.',
    warnings: [{
      id: 'admin_token_missing',
      severity: 'error',
      message: 'AMOJI_ADMIN_TOKEN is not set, so every admin route is disabled (503).',
    }],
  };
}

function unauthorizedBody(): Record<string, unknown> {
  return { error: 'unauthorized', code: 'admin_unauthorized' };
}

function count(db: DatabaseSync, sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...params);
  if (!row || typeof row !== 'object') return 0;
  const value = (row as { c?: unknown }).c;
  return typeof value === 'number' ? value : 0;
}

function utcDayStart(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS;
}

interface UserRow {
  id: string;
  created_at: number;
  plan: string | null;
  plan_expires_at: number | null;
  kid_mode: number | null;
  last_session_at: number | null;
  active_sessions: number;
  chat_turns: number;
}

function planIsPlus(row: UserRow, now: number): boolean {
  return row.plan === 'plus' && (row.plan_expires_at === null || row.plan_expires_at > now);
}

function userShape(row: UserRow, now: number): Record<string, unknown> {
  return {
    id: row.id,
    createdAt: row.created_at,
    plan: planIsPlus(row, now) ? 'plus' : 'free',
    planExpiresAt: row.plan_expires_at,
    kidMode: row.kid_mode === 1,
    lastSessionAt: row.last_session_at,
    activeSessions: row.active_sessions,
    chatTurns: row.chat_turns,
  };
}

const USER_SELECT = `
  SELECT
    u.id,
    u.created_at,
    e.plan AS plan,
    e.expires_at AS plan_expires_at,
    cs.kid_mode AS kid_mode,
    (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_session_at,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > ?) AS active_sessions,
    (SELECT COUNT(*) FROM chat_turns c WHERE c.user_id = u.id) AS chat_turns
  FROM users u
  LEFT JOIN entitlements e ON e.user_id = u.id
  LEFT JOIN character_state cs ON cs.user_id = u.id
`;

function readUserRow(db: DatabaseSync, userId: string, now: number): UserRow | undefined {
  const row = db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(now, userId);
  return row && typeof row === 'object' ? row as UserRow : undefined;
}

function parsePositiveInt(raw: string | null, fallback: number, max: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(Math.trunc(n), max));
}

function statsBody(db: DatabaseSync, now: number): Record<string, unknown> {
  const totalUsers = count(db, 'SELECT COUNT(*) AS c FROM users');
  const newUsersToday = count(db, 'SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', utcDayStart(now));
  const activeSessions = count(db, 'SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?', now);
  const chatTurns = count(db, 'SELECT COUNT(*) AS c FROM chat_turns');
  const chatTurnsToday = count(db, 'SELECT COUNT(*) AS c FROM chat_turns WHERE created_at >= ?', utcDayStart(now));
  const plusUsers = count(
    db,
    "SELECT COUNT(*) AS c FROM entitlements WHERE plan = 'plus' AND (expires_at IS NULL OR expires_at > ?)",
    now,
  );
  const reports = count(db, 'SELECT COUNT(*) AS c FROM reports');
  const supportMessages = count(db, 'SELECT COUNT(*) AS c FROM support_messages');
  const limits = readSearchLimits(db, now);
  return {
    totalUsers,
    newUsersToday,
    activeSessions,
    chatTurns,
    chatTurnsToday,
    plans: {
      free: Math.max(0, totalUsers - plusUsers),
      plus: plusUsers,
    },
    reports,
    supportMessages,
    search: limits,
    generatedAt: now,
  };
}

function warningsBody(db: DatabaseSync, now: number): Record<string, unknown> {
  const limits = readSearchLimits(db, now);
  // Real numbers now that `POST /api/search` counts allowed searches. Both
  // counters come from the same store `consumeRateLimit` writes.
  const usage = readSearchUsage(db, now);
  type Warning = { id: string; severity: 'info' | 'warn' | 'error'; message: string };
  const warnings: Warning[] = [];

  if (usage.searchesThisWindow >= usage.maxSearchesPerWindow) {
    warnings.push({
      id: 'search_volume_at_limit',
      severity: 'warn',
      message: `Search volume this window is ${usage.searchesThisWindow} (cap ${usage.maxSearchesPerWindow} per client). Consider switching the breaker to soft.`,
    });
  } else if (usage.maxSearchesPerWindow > 0
    && usage.searchesThisWindow / usage.maxSearchesPerWindow >= 0.5) {
    warnings.push({
      id: 'search_volume_rising',
      severity: 'info',
      message: `Search volume this window is ${usage.searchesThisWindow} of ${usage.maxSearchesPerWindow} — approaching the limit.`,
    });
  }

  if (limits.breaker === 'hard') {
    warnings.push({
      id: 'breaker_hard',
      severity: 'error',
      message: 'Search breaker is HARD: API search is refused.',
    });
  } else if (limits.breaker === 'soft') {
    warnings.push({
      id: 'breaker_soft',
      severity: 'warn',
      message: `Search breaker is SOFT: limited to ${limits.maxSearchesPerWindow} searches per ${Math.round(limits.windowSeconds / 60)} minutes.`,
    });
  }

  if (limits.maxSearchesPerWindow <= 0) {
    warnings.push({
      id: 'search_cap_zero',
      severity: 'error',
      message: 'maxSearchesPerWindow is 0, so soft mode cannot allow any search.',
    });
  }

  if (!mailConfigured()) {
    warnings.push({
      id: 'mail_not_configured',
      severity: 'warn',
      message: 'Email is not configured (RESEND_API_KEY + AMOJI_MAIL_FROM). Reports and support messages are stored but not emailed.',
    });
  }

  if (!stripeConfigured() && !billingDemoMode()) {
    warnings.push({
      id: 'billing_not_configured',
      severity: 'info',
      message: 'Billing is not configured. Plus checkout will answer 503 until Stripe or a payment link is set.',
    });
  }

  const cors = (process.env.AMOJI_CORS_ORIGIN ?? '*').trim() || '*';
  if (cors === '*') {
    warnings.push({
      id: 'cors_open',
      severity: 'warn',
      message: 'CORS allows every origin (*). In production lock AMOJI_CORS_ORIGIN to the GitHub Pages origin.',
    });
  }

  const dbPath = (process.env.AMOJI_DB ?? '').trim();
  if (dbPath === ':memory:') {
    warnings.push({
      id: 'db_in_memory',
      severity: 'error',
      message: 'The database is in memory (:memory:): every account and setting disappears on restart.',
    });
  }

  const provider = (process.env.AMOJI_LLM_PROVIDER ?? '').trim().toLowerCase();
  const hasLlmKey = LLM_KEY_ENVS.some((key) => (process.env[key] ?? '').trim().length > 0);
  if (provider === 'offline') {
    warnings.push({
      id: 'llm_offline',
      severity: 'info',
      message: 'AMOJI_LLM_PROVIDER=offline: chat uses canned replies with no model call.',
    });
  } else if (!hasLlmKey) {
    warnings.push({
      id: 'llm_keyless',
      severity: 'info',
      message: 'No model key set: chat falls back to the keyless Pollinations lane, then offline replies.',
    });
  }

  const hasError = warnings.some((w) => w.severity === 'error');
  return {
    ok: !hasError,
    status: hasError ? 'attention' : 'ok',
    warnings,
    limits,
    searchUsage: usage,
    checkedAt: now,
  };
}

function userListBody(
  db: DatabaseSync,
  url: URL,
  now: number,
): Record<string, unknown> {
  const limit = parsePositiveInt(url.searchParams.get('limit'), 50, 200) || 50;
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0, 1_000_000);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 64);
  const like = q ? `%${q.replace(/[%_]/g, '')}%` : '';

  const total = q
    ? count(db, 'SELECT COUNT(*) AS c FROM users WHERE id LIKE ?', like)
    : count(db, 'SELECT COUNT(*) AS c FROM users');
  const rows = (q
    ? db.prepare(`${USER_SELECT} WHERE u.id LIKE ? ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).all(now, like, limit, offset)
    : db.prepare(`${USER_SELECT} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).all(now, limit, offset)
  ) as unknown as UserRow[];

  return {
    total,
    limit,
    offset,
    users: rows.map((row) => userShape(row, now)),
    generatedAt: now,
  };
}

function userDetailBody(
  db: DatabaseSync,
  userId: string,
  now: number,
): Record<string, unknown> | undefined {
  const row = readUserRow(db, userId, now);
  if (!row) return undefined;
  const entitlement = readEntitlement(db, userId, now);
  const sessions = db.prepare(
    'SELECT created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
  ).all(userId).map((s) => {
    const r = s as { created_at: number; expires_at: number };
    return { createdAt: r.created_at, expiresAt: r.expires_at, active: r.expires_at > now };
  });
  return {
    user: userShape(row, now),
    state: readState(db, userId),
    entitlement,
    sessions,
    counts: {
      chatTurns: count(db, 'SELECT COUNT(*) AS c FROM chat_turns WHERE user_id = ?', userId),
      reports: count(db, 'SELECT COUNT(*) AS c FROM reports WHERE user_id = ?', userId),
      supportMessages: count(db, 'SELECT COUNT(*) AS c FROM support_messages WHERE user_id = ?', userId),
    },
    generatedAt: now,
  };
}

type BodyRead =
  | { ok: true; value: unknown }
  | { ok: false; status: number; error: string };

async function readBody(req: Request): Promise<BodyRead> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'body too large' };
  if (!text.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: 'invalid json' };
  }
}

export async function handleAdminRoute(
  req: Request,
  url: URL,
  db: DatabaseSync,
  now: number,
): Promise<AdminResult> {
  // Create the two admin tables even when auth fails, so a disabled server has
  // a consistent schema once the token is configured.
  ensureAdminTables(db);

  if (!adminEnabled()) return { status: 503, body: disabledBody() };
  const provided = bearerToken(req);
  if (!provided || !tokensMatch(provided, adminToken())) {
    return { status: 401, body: unauthorizedBody() };
  }

  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (path === '/api/admin/stats') {
    if (method !== 'GET') return { status: 405, body: { error: 'method not allowed' } };
    return { status: 200, body: statsBody(db, now) };
  }

  if (path === '/api/admin/warnings') {
    if (method !== 'GET') return { status: 405, body: { error: 'method not allowed' } };
    return { status: 200, body: warningsBody(db, now) };
  }

  if (path === '/api/admin/users') {
    if (method !== 'GET') return { status: 405, body: { error: 'method not allowed' } };
    return { status: 200, body: userListBody(db, url, now) };
  }

  const revokeMatch = /^\/api\/admin\/users\/([^/]+)\/revoke-sessions$/.exec(path);
  if (revokeMatch?.[1]) {
    if (method !== 'POST') return { status: 405, body: { error: 'method not allowed' } };
    const userId = decodeURIComponent(revokeMatch[1]);
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!exists) return { status: 404, body: { error: 'user not found' } };
    const result = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    const revoked = typeof result.changes === 'number' ? result.changes : Number(result.changes ?? 0);
    return { status: 200, body: { ok: true, userId, revoked } };
  }

  const userMatch = /^\/api\/admin\/users\/([^/]+)$/.exec(path);
  if (userMatch?.[1]) {
    if (method !== 'GET') return { status: 405, body: { error: 'method not allowed' } };
    const userId = decodeURIComponent(userMatch[1]);
    const detail = userDetailBody(db, userId, now);
    return detail
      ? { status: 200, body: detail }
      : { status: 404, body: { error: 'user not found' } };
  }

  if (path === '/api/admin/limits') {
    if (method === 'GET') {
      return {
        status: 200,
        body: {
          ok: true,
          limits: readSearchLimits(db, now),
          history: listAdminEvents(db, 20),
          generatedAt: now,
        },
      };
    }
    if (method !== 'PUT') return { status: 405, body: { error: 'method not allowed' } };
    const body = await readBody(req);
    if (!body.ok) return { status: body.status, body: { error: body.error } };
    const patch = (body.value ?? {}) as { breaker?: unknown; maxSearchesPerWindow?: unknown };
    const next: SearchLimitsPatch = {};
    if (patch.breaker !== undefined) {
      if (!isBreakerMode(patch.breaker)) {
        return { status: 400, body: { error: 'breaker must be one of closed | soft | hard' } };
      }
      next.breaker = patch.breaker as BreakerMode;
    }
    if (patch.maxSearchesPerWindow !== undefined) {
      if (!isSearchCap(patch.maxSearchesPerWindow)) {
        return { status: 400, body: { error: 'maxSearchesPerWindow must be a non-negative integer' } };
      }
      next.maxSearchesPerWindow = patch.maxSearchesPerWindow;
    }
    const written = writeSearchLimits(db, next, now);
    if (!written.ok) return { status: 400, body: { error: written.error } };
    return {
      status: 200,
      body: {
        ok: true,
        limits: written.limits,
        previous: written.previous,
        history: listAdminEvents(db, 20),
      },
    };
  }

  if (path === '/api/admin/events') {
    if (method !== 'GET') return { status: 405, body: { error: 'method not allowed' } };
    const limit = parsePositiveInt(url.searchParams.get('limit'), 20, 200) || 20;
    return { status: 200, body: { ok: true, events: listAdminEvents(db, limit) } };
  }

  return { status: 404, body: { error: 'not found' } };
}

/** Exported for the admin page's diagnostics and tests. */
export function limitsSnapshot(db: DatabaseSync, now: number): SearchLimits {
  return readSearchLimits(db, now);
}
