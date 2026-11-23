/**
 * Admin policy adapter over `rate-limit.ts` — ONE source of truth.
 *
 * `rate-limit.ts` owns the breaker (`closed | soft | hard`) and the token
 * buckets. This file only:
 *   · stores the owner's numeric cap (`maxSearchesPerWindow`) in
 *     `admin_settings`, because the cap is an admin knob, not engine state;
 *   · exposes the breaker through `readCircuitBreaker` / `setCircuitBreaker`
 *     so `/api/admin/limits` and `consumeRateLimit` can never disagree;
 *   · appends the timestamped change history in `admin_events`.
 *
 * Before this adapter there were two breakers: `admin_settings.search.breaker`
 * (read by the panel) and `rate_limit_kv.breaker` (read by the limiter). An
 * admin PUT changed one and enforcement read the other. `readSearchLimits` now
 * migrates any legacy `admin_settings.search.breaker` row into the shared store
 * exactly once, and then never reads it again.
 *
 * Semantics agreed with the owner:
 *   closed — normal token bucket
 *   soft   — allowed, but the client speaks a long line for `delayMs` first
 *   hard   — every API search is refused with a positive `retryAfterMs`
 *
 * `/api/admin/limits` GET/PUT and `/api/admin/events` shapes are unchanged so
 * the already-verified `apps/web/public/docs/admin.html` keeps working.
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  isBreakerState,
  readCircuitBreaker,
  readonlyWindowUsage,
  setCircuitBreaker,
  type BreakerSnapshot,
  type RateLimitRule,
} from './rate-limit.js';
import { rateLimitStoreFor } from './rate-limit-sqlite.js';

export const BREAKER_MODES = ['closed', 'soft', 'hard'] as const;
export type BreakerMode = (typeof BREAKER_MODES)[number];

/** Window is fixed for now; surfaced in the API so a future breaker can change it. */
export const SEARCH_WINDOW_SECONDS = 60 * 60;
export const DEFAULT_MAX_SEARCHES_PER_WINDOW = 30;
export const MAX_SEARCHES_CEILING = 100_000;
/** How long the character should talk before a soft-mode search runs. */
export const SEARCH_SOFT_DELAY_MS = 2_500;
/** Route id used by both `consumeRateLimit` and the admin counters. */
export const SEARCH_ROUTE = 'search';

export interface SearchLimits {
  breaker: BreakerMode;
  maxSearchesPerWindow: number;
  windowSeconds: number;
  updatedAt: number;
}

export interface SearchLimitsPatch {
  breaker?: BreakerMode;
  maxSearchesPerWindow?: number;
}

export type SearchLimitsWrite =
  | { ok: true; limits: SearchLimits; previous: SearchLimits }
  | { ok: false; error: string };

export interface AdminEvent {
  id: number;
  kind: string;
  detail: string;
  createdAt: number;
}

/** Real counters for the owner's "too many people search" warning. */
export interface SearchUsage {
  breaker: BreakerMode;
  /** Allowed API searches since 00:00 UTC. */
  searchesToday: number;
  /** Allowed API searches in the current refill cycle, every client key. */
  searchesThisWindow: number;
  windowStartedAt: number;
  windowSeconds: number;
  maxSearchesPerWindow: number;
  /** `searchesThisWindow / maxSearchesPerWindow`, clamped to [0, 1]. */
  windowUtilisation: number;
}

type LegacyBreaker = string | undefined;

const KEY_BREAKER_LEGACY = 'search.breaker';
const KEY_MAX = 'search.max_searches_per_window';
const KEY_UPDATED = 'search.updated_at';

export function ensureAdminTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  // Creating the shared tables here means a fresh admin-only boot also has the
  // rate-limit schema the breaker lives in.
  rateLimitStoreFor(db);
  migrateLegacyBreaker(db);
}

function getSetting(db: DatabaseSync, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get(key);
  if (!row || typeof row !== 'object') return undefined;
  const value = (row as { value?: unknown }).value;
  return typeof value === 'string' ? value : undefined;
}

function putSetting(db: DatabaseSync, key: string, value: string, now: number): void {
  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, value, now);
}

/**
 * One-time move of the pre-adapter breaker into `rate_limit_kv`.
 * Runs only when the shared store has no breaker yet; after that the legacy
 * row is inert (and left in place so an older binary can still read it).
 */
function migrateLegacyBreaker(db: DatabaseSync): void {
  const legacy: LegacyBreaker = getSetting(db, KEY_BREAKER_LEGACY);
  if (!isBreakerState(legacy)) return;
  const store = rateLimitStoreFor(db);
  if (store.getBreaker()) return;
  const rawUpdated = Number(getSetting(db, KEY_UPDATED));
  const snapshot: BreakerSnapshot = {
    state: legacy,
    changedAt: Number.isFinite(rawUpdated) && rawUpdated > 0 ? rawUpdated : 0,
    changedBy: 'migration',
  };
  store.putBreaker(snapshot);
}

export function isBreakerMode(value: unknown): value is BreakerMode {
  return typeof value === 'string' && (BREAKER_MODES as readonly string[]).includes(value);
}

export function isSearchCap(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    && value <= MAX_SEARCHES_CEILING;
}

export function readSearchLimits(db: DatabaseSync, now: number): SearchLimits {
  ensureAdminTables(db);
  const breaker = readCircuitBreaker(rateLimitStoreFor(db));
  const rawMax = Number(getSetting(db, KEY_MAX));
  const rawUpdated = Number(getSetting(db, KEY_UPDATED));
  const capUpdatedAt = Number.isFinite(rawUpdated) && rawUpdated > 0 ? rawUpdated : 0;
  const newest = Math.max(capUpdatedAt, breaker.changedAt);
  return {
    breaker: isBreakerState(breaker.state) ? breaker.state : 'closed',
    maxSearchesPerWindow: isSearchCap(rawMax) ? rawMax : DEFAULT_MAX_SEARCHES_PER_WINDOW,
    windowSeconds: SEARCH_WINDOW_SECONDS,
    updatedAt: newest > 0 ? newest : now,
  };
}

function recordEvent(db: DatabaseSync, kind: string, detail: string, now: number): void {
  db.prepare(
    'INSERT INTO admin_events (kind, detail, created_at) VALUES (?, ?, ?)',
  ).run(kind, detail.slice(0, 500), now);
}

export function writeSearchLimits(
  db: DatabaseSync,
  patch: SearchLimitsPatch,
  now: number,
): SearchLimitsWrite {
  if (patch.breaker !== undefined && !isBreakerMode(patch.breaker)) {
    return { ok: false, error: 'breaker must be one of closed | soft | hard' };
  }
  if (patch.maxSearchesPerWindow !== undefined && !isSearchCap(patch.maxSearchesPerWindow)) {
    return { ok: false, error: `maxSearchesPerWindow must be an integer 0..${MAX_SEARCHES_CEILING}` };
  }
  if (patch.breaker === undefined && patch.maxSearchesPerWindow === undefined) {
    return { ok: false, error: 'provide breaker and/or maxSearchesPerWindow' };
  }

  const previous = readSearchLimits(db, now);
  const next: SearchLimits = {
    breaker: patch.breaker ?? previous.breaker,
    maxSearchesPerWindow: patch.maxSearchesPerWindow ?? previous.maxSearchesPerWindow,
    windowSeconds: SEARCH_WINDOW_SECONDS,
    updatedAt: now,
  };

  const store = rateLimitStoreFor(db);
  db.exec('BEGIN');
  try {
    // The breaker write goes through the shared store, so `consumeRateLimit`
    // sees it immediately — this is the single-source-of-truth guarantee.
    if (patch.breaker !== undefined) {
      setCircuitBreaker(store, next.breaker, { now, changedBy: 'admin' });
    }
    putSetting(db, KEY_MAX, String(next.maxSearchesPerWindow), now);
    putSetting(db, KEY_UPDATED, String(now), now);
    recordEvent(
      db,
      'limits.update',
      `breaker ${previous.breaker} -> ${next.breaker}; max ${previous.maxSearchesPerWindow} -> ${next.maxSearchesPerWindow}`,
      now,
    );
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* already rolled back */ }
    return { ok: false, error: err instanceof Error ? err.message : 'failed to persist limits' };
  }
  return { ok: true, limits: next, previous };
}

/**
 * The rule `consumeRateLimit` must use for `/api/search`.
 *
 * `softLimit: limit` is deliberate: the owner asked soft mode to DELAY, not to
 * refuse. With the soft ceiling equal to the bucket size, soft allows every
 * request that still has a token and only reports `delayMs`.
 */
export function searchRateLimitRule(db: DatabaseSync, now: number): RateLimitRule {
  const limits = readSearchLimits(db, now);
  return {
    limit: Math.max(1, limits.maxSearchesPerWindow),
    windowMs: limits.windowSeconds * 1000,
    softLimit: Math.max(1, limits.maxSearchesPerWindow),
    softDelayMs: SEARCH_SOFT_DELAY_MS,
  };
}

/** Real volume numbers for `/api/admin/warnings`. Read-only. */
export function readSearchUsage(db: DatabaseSync, now: number): SearchUsage {
  const limits = readSearchLimits(db, now);
  const usage = readonlyWindowUsage(
    rateLimitStoreFor(db),
    SEARCH_ROUTE,
    now,
    limits.windowSeconds * 1000,
  );
  const max = limits.maxSearchesPerWindow;
  return {
    breaker: limits.breaker,
    searchesToday: usage.daily,
    searchesThisWindow: usage.window,
    windowStartedAt: usage.windowStartedAt,
    windowSeconds: limits.windowSeconds,
    maxSearchesPerWindow: max,
    windowUtilisation: max > 0 ? Math.min(1, usage.window / max) : 0,
  };
}

export function listAdminEvents(db: DatabaseSync, limit = 20): AdminEvent[] {
  ensureAdminTables(db);
  const capped = Math.max(1, Math.min(Math.trunc(limit), 200));
  const rows = db.prepare(
    'SELECT id, kind, detail, created_at FROM admin_events ORDER BY id DESC LIMIT ?',
  ).all(capped);
  return rows.map((row) => {
    const r = row as { id: number; kind: string; detail: string; created_at: number };
    return { id: r.id, kind: r.kind, detail: r.detail, createdAt: r.created_at };
  });
}
