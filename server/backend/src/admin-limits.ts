/**
 * Admin-owned search breaker policy (state + change log).
 *
 * TODO(rate-limit): `server/backend/src/rate-limit.ts` (search budget + circuit
 * breaker, being written on a parallel branch) is the long-term owner of this
 * state. When it lands, replace the read/write functions below with an adapter
 * over that module and keep the `/api/admin/limits` HTTP shape stable. Until
 * then this file is the only writer of `admin_settings` / `admin_events`.
 *
 * Semantics agreed with the owner:
 *   closed — normal search
 *   soft   — allow up to `maxSearchesPerWindow`; the client should show a long
 *            character line as a deliberate delay
 *   hard   — refuse API search entirely
 *
 * This module deliberately does not create `rate-limit.ts`.
 */
import type { DatabaseSync } from 'node:sqlite';

export const BREAKER_MODES = ['closed', 'soft', 'hard'] as const;
export type BreakerMode = (typeof BREAKER_MODES)[number];

/** Window is fixed for now; surfaced in the API so a future breaker can change it. */
export const SEARCH_WINDOW_SECONDS = 60 * 60;
export const DEFAULT_MAX_SEARCHES_PER_WINDOW = 30;
export const MAX_SEARCHES_CEILING = 100_000;

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

const KEY_BREAKER = 'search.breaker';
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
  const rawBreaker = getSetting(db, KEY_BREAKER);
  const rawMax = Number(getSetting(db, KEY_MAX));
  const rawUpdated = Number(getSetting(db, KEY_UPDATED));
  return {
    breaker: isBreakerMode(rawBreaker) ? rawBreaker : 'closed',
    maxSearchesPerWindow: isSearchCap(rawMax) ? rawMax : DEFAULT_MAX_SEARCHES_PER_WINDOW,
    windowSeconds: SEARCH_WINDOW_SECONDS,
    updatedAt: Number.isFinite(rawUpdated) && rawUpdated > 0 ? rawUpdated : now,
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

  db.exec('BEGIN');
  try {
    putSetting(db, KEY_BREAKER, next.breaker, now);
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
