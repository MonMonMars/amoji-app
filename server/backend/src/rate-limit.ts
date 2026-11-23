/**
 * Server-side enforcement for the OPTIONAL search API (Jamendo provider).
 *
 * Why this file exists
 * --------------------
 * The curated music list costs nothing and never needs a quota. The API-search
 * provider shares ONE Jamendo client id across every listener, so bursts there
 * burn the owner's quota. This module is the real enforcement tier: a token
 * bucket keyed by `(route, clientKey)` plus a global circuit breaker the owner
 * can flip at runtime.
 *
 * Deliberately framework-free: no HTTP, no `node:sqlite` import, no DOM. It
 * accepts a store so it can run on:
 *   · sqlite (`node:sqlite`) inside the existing `server/backend`,
 *   · Cloudflare KV / Durable Objects,
 *   · Upstash Redis / Vercel KV,
 *   · Supabase Postgres,
 *   · or the in-memory store below in tests.
 *
 * The admin wiring (routes, auth) is specified in `docs/ADMIN_CONTROL.md` and
 * intentionally deferred — `http.ts` is not touched here.
 */

export type BreakerState = 'closed' | 'soft' | 'hard';

export interface RateLimitRule {
  /** Bucket capacity: requests allowed from a full bucket. */
  limit: number;
  /** Refill horizon: a completely empty bucket refills in this many ms. */
  windowMs: number;
  /**
   * Soft-mode ceiling. While the breaker is `soft`, only this many requests
   * from the current refill cycle are allowed; the rest are refused with the
   * delay message. Defaults to 25% of `limit`, minimum 1.
   */
  softLimit?: number;
  /** How long the client should hold/speak before a soft-mode search. */
  softDelayMs?: number;
}

/** Defaults for the optional search route: 20 per 10 min per key, 5 in soft mode. */
export const SEARCH_RATE_LIMIT_RULE: RateLimitRule = Object.freeze({
  limit: 20,
  windowMs: 10 * 60_000,
  softLimit: 5,
  softDelayMs: 2_500,
});

/** Persisted token-bucket state for one `(route, clientKey)` pair. */
export interface RateLimitBucket {
  /** Whole/partial tokens available at `updatedAt`. */
  tokens: number;
  updatedAt: number;
}

export interface BreakerSnapshot {
  state: BreakerState;
  changedAt: number;
  changedBy?: string;
}

/**
 * Persistence seam. Implement these five methods on sqlite/KV/Redis later.
 * `incrementDaily` / `readDaily` are OPTIONAL: the admin dashboard uses them
 * for "searches today"; enforcing tiers work without them.
 */
export interface RateLimitStore {
  getBucket(key: string): RateLimitBucket | undefined;
  putBucket(key: string, bucket: RateLimitBucket): void;
  getBreaker(): BreakerSnapshot | undefined;
  putBreaker(snapshot: BreakerSnapshot): void;
  incrementDaily?(route: string, day: string): number;
  readDaily?(route: string, day: string): number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** `ok` = allowed immediately, `soft` = allowed after delay OR refused by soft quota. */
  reason: 'ok' | 'soft' | 'hard' | 'bucket';
  limit: number;
  /** Integer tokens left in the bucket after this decision. */
  remaining: number;
  /** Integer tokens consumed in the current refill cycle after this decision. */
  used: number;
  /** When the bucket is full again (epoch ms). */
  resetAt: number;
  /** When to retry: 0 when allowed normally, `delayMs` for soft, refill ms for hard/bucket. */
  retryAfterMs: number;
  /** Milliseconds the character should speak before searching (soft only). */
  delayMs: number;
  breaker: BreakerState;
  bucketKey: string;
}

export interface ConsumeOptions {
  /** Epoch ms. Defaults to `Date.now`. */
  now?: number;
  /** Override the persisted breaker (tests, previews). */
  breaker?: BreakerState;
}

/** In-memory store: tests, and a single-process fallback (NOT durable). */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private breaker: BreakerSnapshot | undefined;
  private readonly daily = new Map<string, number>();

  getBucket(key: string): RateLimitBucket | undefined {
    const found = this.buckets.get(key);
    return found ? { ...found } : undefined;
  }

  putBucket(key: string, bucket: RateLimitBucket): void {
    this.buckets.set(key, { ...bucket });
  }

  getBreaker(): BreakerSnapshot | undefined {
    return this.breaker ? { ...this.breaker } : undefined;
  }

  putBreaker(snapshot: BreakerSnapshot): void {
    this.breaker = { ...snapshot };
  }

  incrementDaily(route: string, day: string): number {
    const key = `${route}|${day}`;
    const next = (this.daily.get(key) ?? 0) + 1;
    this.daily.set(key, next);
    return next;
  }

  readDaily(route: string, day: string): number {
    return this.daily.get(`${route}|${day}`) ?? 0;
  }

  /** Test helper: drop every bucket but keep the breaker. */
  clearBuckets(): void {
    this.buckets.clear();
  }
}

/**
 * TODO(sqlite): implement `RateLimitStore` against `node:sqlite` in the
 * existing backend once it is deployed. Suggested shape (do not import
 * `node:sqlite` here — this module must stay runtime-agnostic):
 *
 *   CREATE TABLE IF NOT EXISTS rate_limit_kv (
 *     key TEXT PRIMARY KEY,
 *     value TEXT NOT NULL,
 *     updated_at INTEGER NOT NULL
 *   );
 *
 * Bucket rows use key `bucket:<route>:<clientKey>` and JSON `{ tokens, updatedAt }`.
 * The breaker uses key `breaker` and JSON `{ state, changedAt, changedBy }`.
 * Postgres/Supabase needs an atomic upsert/increment; Workers KV is eventually
 * consistent, so a burst can briefly overshoot — see docs/ADMIN_CONTROL.md.
 */

export function isBreakerState(value: unknown): value is BreakerState {
  return value === 'closed' || value === 'soft' || value === 'hard';
}

export function bucketKey(route: string, clientKey: string): string {
  return `${route}:${clientKey}`;
}

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function readCircuitBreaker(store: RateLimitStore): BreakerSnapshot {
  const snapshot = store.getBreaker();
  if (snapshot && isBreakerState(snapshot.state)) return snapshot;
  return { state: 'closed', changedAt: 0 };
}

export interface BreakerUpdate {
  now?: number;
  changedBy?: string;
}

/** Runtime admin switch. Persists through the store so every instance sees it. */
export function setCircuitBreaker(
  store: RateLimitStore,
  state: BreakerState,
  options: BreakerUpdate = {},
): BreakerSnapshot {
  if (!isBreakerState(state)) throw new RangeError(`invalid breaker state: ${String(state)}`);
  const now = options.now ?? Date.now();
  const snapshot: BreakerSnapshot = {
    state,
    changedAt: now,
    ...(options.changedBy ? { changedBy: options.changedBy } : {}),
  };
  store.putBreaker(snapshot);
  return snapshot;
}

function validateRule(rule: RateLimitRule): void {
  if (!Number.isFinite(rule.limit) || rule.limit < 1) {
    throw new RangeError('rate-limit: limit must be a finite number >= 1');
  }
  if (!Number.isFinite(rule.windowMs) || rule.windowMs <= 0) {
    throw new RangeError('rate-limit: windowMs must be a positive finite number');
  }
  if (rule.softLimit !== undefined && (!Number.isInteger(rule.softLimit) || rule.softLimit < 1)) {
    throw new RangeError('rate-limit: softLimit must be an integer >= 1');
  }
  if (rule.softDelayMs !== undefined && (!Number.isFinite(rule.softDelayMs) || rule.softDelayMs < 0)) {
    throw new RangeError('rate-limit: softDelayMs must be a finite number >= 0');
  }
}

function softLimitFor(rule: RateLimitRule): number {
  return Math.min(rule.limit, rule.softLimit ?? Math.max(1, Math.ceil(rule.limit * 0.25)));
}

function msUntilToken(tokens: number, ratePerMs: number): number {
  if (tokens >= 1) return 0;
  return Math.max(1, Math.ceil((1 - tokens) / ratePerMs));
}

function hardRetryAfter(tokens: number, rule: RateLimitRule, ratePerMs: number): number {
  const refill = msUntilToken(tokens, ratePerMs);
  return refill > 0 ? refill : Math.max(1, Math.ceil(rule.windowMs));
}

function positiveTokens(value: number, limit: number): number {
  if (!Number.isFinite(value)) return limit;
  return Math.max(0, Math.min(limit, value));
}

/**
 * Consumes one token when allowed. `clientKey` is an IP or account id supplied
 * by the caller — this module never parses headers.
 */
export function consumeRateLimit(
  store: RateLimitStore,
  route: string,
  clientKey: string,
  rule: RateLimitRule = SEARCH_RATE_LIMIT_RULE,
  options: ConsumeOptions = {},
): RateLimitDecision {
  validateRule(rule);
  const now = options.now ?? Date.now();
  const key = bucketKey(route, clientKey);
  const ratePerMs = rule.limit / rule.windowMs;
  const breaker = options.breaker ?? readCircuitBreaker(store).state;

  const stored = store.getBucket(key);
  const tokensBefore = stored
    ? positiveTokens(
      stored.tokens + Math.max(0, now - stored.updatedAt) * ratePerMs,
      rule.limit,
    )
    : rule.limit;

  const fresh = (tokens: number, used: number): RateLimitDecision => {
    const remaining = Math.max(0, Math.floor(tokens));
    const consumed = Math.max(0, rule.limit - remaining);
    return {
      allowed: false,
      reason: 'bucket',
      limit: rule.limit,
      remaining,
      used: used > 0 ? used : consumed,
      resetAt: tokens >= rule.limit
        ? now
        : now + Math.max(1, Math.ceil((rule.limit - tokens) / ratePerMs)),
      retryAfterMs: msUntilToken(tokens, ratePerMs),
      delayMs: 0,
      breaker,
      bucketKey: key,
    };
  };

  if (breaker === 'hard') {
    // Refusal still persists the refilled bucket so the next read is accurate.
    store.putBucket(key, { tokens: tokensBefore, updatedAt: now });
    return {
      allowed: false,
      reason: 'hard',
      limit: rule.limit,
      remaining: Math.max(0, Math.floor(tokensBefore)),
      used: Math.max(0, rule.limit - Math.floor(tokensBefore)),
      resetAt: tokensBefore >= rule.limit
        ? now
        : now + Math.max(1, Math.ceil((rule.limit - tokensBefore) / ratePerMs)),
      retryAfterMs: hardRetryAfter(tokensBefore, rule, ratePerMs),
      delayMs: 0,
      breaker,
      bucketKey: key,
    };
  }

  if (breaker === 'soft') {
    const softLimit = softLimitFor(rule);
    const usedInCycle = rule.limit - tokensBefore;
    const delayMs = rule.softDelayMs ?? 0;

    if (usedInCycle >= softLimit || tokensBefore < 1) {
      store.putBucket(key, { tokens: tokensBefore, updatedAt: now });
      const refused = fresh(tokensBefore, Math.round(usedInCycle));
      return {
        ...refused,
        reason: 'soft',
        delayMs,
        retryAfterMs: msUntilToken(tokensBefore, ratePerMs) || delayMs || 1,
      };
    }

    const after = Math.max(0, tokensBefore - 1);
    store.putBucket(key, { tokens: after, updatedAt: now });
    store.incrementDaily?.(route, dayKey(now));
    const remaining = Math.max(0, Math.floor(after));
    return {
      allowed: true,
      reason: 'soft',
      limit: rule.limit,
      remaining,
      used: rule.limit - remaining,
      resetAt: remaining >= rule.limit
        ? now
        : now + Math.max(1, Math.ceil((rule.limit - after) / ratePerMs)),
      retryAfterMs: delayMs,
      delayMs,
      breaker,
      bucketKey: key,
    };
  }

  // breaker === 'closed'
  if (tokensBefore < 1) {
    store.putBucket(key, { tokens: tokensBefore, updatedAt: now });
    return fresh(tokensBefore, Math.round(rule.limit - tokensBefore));
  }

  const after = Math.max(0, tokensBefore - 1);
  store.putBucket(key, { tokens: after, updatedAt: now });
  store.incrementDaily?.(route, dayKey(now));
  const remaining = Math.max(0, Math.floor(after));
  return {
    allowed: true,
    reason: 'ok',
    limit: rule.limit,
    remaining,
    used: rule.limit - remaining,
    resetAt: remaining >= rule.limit
      ? now
      : now + Math.max(1, Math.ceil((rule.limit - after) / ratePerMs)),
    retryAfterMs: 0,
    delayMs: 0,
    breaker,
    bucketKey: key,
  };
}

/** Dashboard helper: searches allowed for `route` today, when the store supports it. */
export function readDailyCount(
  store: RateLimitStore,
  route: string,
  now: number = Date.now(),
): number | undefined {
  return store.readDaily?.(route, dayKey(now));
}
