/**
 * The ONLY durable `RateLimitStore` in this repo: `node:sqlite`.
 *
 * `rate-limit.ts` stays runtime-agnostic on purpose (no sqlite import). This
 * file is the seam the backend wires, so bucket tokens, the circuit breaker,
 * today's count, and the per-cycle count all live in one database — the same
 * file as users and sessions. `admin-limits.ts` is a thin adapter over this
 * store, which is why an admin PUT is visible to `consumeRateLimit` on the
 * very next search (the regression test pins that).
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  isBreakerState,
  type BreakerSnapshot,
  type RateLimitBucket,
  type RateLimitStore,
} from './rate-limit.js';

const BREAKER_KEY = 'breaker';

export function ensureRateLimitTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limit_daily (
      route TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (route, day)
    );
    CREATE TABLE IF NOT EXISTS rate_limit_window (
      route TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (route, window_start)
    );
  `);
}

function readJson(db: DatabaseSync, key: string): unknown {
  const row = db.prepare('SELECT value FROM rate_limit_kv WHERE key = ?').get(key);
  if (!row || typeof row !== 'object') return undefined;
  const value = (row as { value?: unknown }).value;
  if (typeof value !== 'string') return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function writeJson(db: DatabaseSync, key: string, value: unknown, now: number): void {
  db.prepare(`
    INSERT INTO rate_limit_kv (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), now);
}

export class SqliteRateLimitStore implements RateLimitStore {
  constructor(private readonly db: DatabaseSync) {
    ensureRateLimitTables(db);
  }

  getBucket(key: string): RateLimitBucket | undefined {
    const parsed = readJson(this.db, `bucket:${key}`);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const row = parsed as { tokens?: unknown; updatedAt?: unknown };
    if (typeof row.tokens !== 'number' || !Number.isFinite(row.tokens)) return undefined;
    if (typeof row.updatedAt !== 'number' || !Number.isFinite(row.updatedAt)) return undefined;
    return { tokens: row.tokens, updatedAt: row.updatedAt };
  }

  putBucket(key: string, bucket: RateLimitBucket): void {
    writeJson(this.db, `bucket:${key}`, bucket, bucket.updatedAt);
  }

  getBreaker(): BreakerSnapshot | undefined {
    const parsed = readJson(this.db, BREAKER_KEY);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const row = parsed as { state?: unknown; changedAt?: unknown; changedBy?: unknown };
    if (!isBreakerState(row.state)) return undefined;
    return {
      state: row.state,
      changedAt: typeof row.changedAt === 'number' && Number.isFinite(row.changedAt) ? row.changedAt : 0,
      ...(typeof row.changedBy === 'string' && row.changedBy ? { changedBy: row.changedBy } : {}),
    };
  }

  putBreaker(snapshot: BreakerSnapshot): void {
    writeJson(this.db, BREAKER_KEY, snapshot, snapshot.changedAt);
  }

  incrementDaily(route: string, day: string): number {
    this.db.prepare(`
      INSERT INTO rate_limit_daily (route, day, count)
      VALUES (?, ?, 1)
      ON CONFLICT(route, day) DO UPDATE SET count = count + 1
    `).run(route, day);
    return this.readDaily(route, day);
  }

  readDaily(route: string, day: string): number {
    const row = this.db.prepare(
      'SELECT count FROM rate_limit_daily WHERE route = ? AND day = ?',
    ).get(route, day);
    const value = row && typeof row === 'object' ? (row as { count?: unknown }).count : undefined;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  incrementWindow(route: string, windowStart: number): number {
    this.db.prepare(`
      INSERT INTO rate_limit_window (route, window_start, count)
      VALUES (?, ?, 1)
      ON CONFLICT(route, window_start) DO UPDATE SET count = count + 1
    `).run(route, windowStart);
    return this.readWindow(route, windowStart);
  }

  readWindow(route: string, windowStart: number): number {
    const row = this.db.prepare(
      'SELECT count FROM rate_limit_window WHERE route = ? AND window_start = ?',
    ).get(route, windowStart);
    const value = row && typeof row === 'object' ? (row as { count?: unknown }).count : undefined;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  /** Housekeeping: drop window rows older than `before` (keeps the file small). */
  pruneWindows(before: number): void {
    this.db.prepare('DELETE FROM rate_limit_window WHERE window_start < ?').run(before);
  }
}

/**
 * One store per open database. `node:sqlite` is synchronous and single-writer,
 * so sharing the instance is safe and avoids re-running `CREATE TABLE` on
 * every request.
 */
const stores = new WeakMap<DatabaseSync, SqliteRateLimitStore>();

export function rateLimitStoreFor(db: DatabaseSync): SqliteRateLimitStore {
  const existing = stores.get(db);
  if (existing) return existing;
  const created = new SqliteRateLimitStore(db);
  stores.set(db, created);
  return created;
}
