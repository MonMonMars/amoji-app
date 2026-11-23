import { describe, expect, it } from 'vitest';
import {
  MemoryRateLimitStore,
  SEARCH_RATE_LIMIT_RULE,
  bucketKey,
  consumeRateLimit,
  dayKey,
  readCircuitBreaker,
  readDailyCount,
  setCircuitBreaker,
  type BreakerSnapshot,
  type RateLimitBucket,
  type RateLimitRule,
  type RateLimitStore,
} from '../src/rate-limit.js';

const T0 = 1_700_000_000_000;

const RULE: RateLimitRule = { limit: 3, windowMs: 1_000 };

/** A second, deliberately different store implementation for the swap test. */
class MapStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private breaker: BreakerSnapshot | undefined;

  getBucket(key: string): RateLimitBucket | undefined {
    return this.buckets.get(key);
  }

  putBucket(key: string, bucket: RateLimitBucket): void {
    this.buckets.set(key, bucket);
  }

  getBreaker(): BreakerSnapshot | undefined {
    return this.breaker;
  }

  putBreaker(snapshot: BreakerSnapshot): void {
    this.breaker = snapshot;
  }
}

function shape(store: RateLimitStore, key = 'ip-1', rule: RateLimitRule = RULE) {
  return consumeRateLimit(store, 'search', key, rule, { now: T0 });
}

describe('rate-limit token bucket', () => {
  it('allows the budget, then refuses with a real retry hint', () => {
    const store = new MemoryRateLimitStore();
    const first = shape(store);
    expect(first.allowed).toBe(true);
    expect(first.reason).toBe('ok');
    expect(first.remaining).toBe(2);
    expect(first.used).toBe(1);
    expect(first.limit).toBe(3);
    expect(first.retryAfterMs).toBe(0);
    expect(first.resetAt).toBe(T0 + 334); // one token at 3 per 1000 ms

    expect(shape(store).remaining).toBe(1);
    expect(shape(store).remaining).toBe(0);

    const refused = shape(store);
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toBe('bucket');
    expect(refused.remaining).toBe(0);
    expect(refused.used).toBe(3);
    expect(refused.retryAfterMs).toBe(334);
    expect(refused.bucketKey).toBe(bucketKey('search', 'ip-1'));
  });

  it('refills continuously rather than on a hard window boundary', () => {
    const store = new MemoryRateLimitStore();
    for (let i = 0; i < 3; i += 1) shape(store);

    const at333 = consumeRateLimit(store, 'search', 'ip-1', RULE, { now: T0 + 333 });
    expect(at333.allowed).toBe(false); // 0.999 tokens
    const at334 = consumeRateLimit(store, 'search', 'ip-1', RULE, { now: T0 + 334 });
    expect(at334.allowed).toBe(true); // 1.002 tokens
    const at1000 = consumeRateLimit(store, 'search', 'ip-1', RULE, { now: T0 + 1_000 });
    expect(at1000.remaining).toBe(1); // ~2.001 before, one consumed
  });

  it('isolates keys per route and per client', () => {
    const store = new MemoryRateLimitStore();
    shape(store, 'ip-a');
    shape(store, 'ip-a');
    expect(shape(store, 'ip-a').allowed).toBe(true);
    expect(shape(store, 'ip-a').allowed).toBe(false);

    expect(shape(store, 'ip-b').allowed).toBe(true);
    expect(consumeRateLimit(store, 'tts', 'ip-a', RULE, { now: T0 }).allowed).toBe(true);
  });
});

describe('rate-limit circuit breaker', () => {
  const breakerRule: RateLimitRule = { limit: 4, windowMs: 60_000, softLimit: 3, softDelayMs: 1_500 };

  it('walks closed -> soft -> hard -> closed and persists each flip', () => {
    const store = new MemoryRateLimitStore();
    const consume = () => consumeRateLimit(store, 'search', 'ip-1', breakerRule, { now: T0 });

    expect(readCircuitBreaker(store).state).toBe('closed');
    expect(consume().allowed).toBe(true);
    expect(consume().allowed).toBe(true);

    const soft = setCircuitBreaker(store, 'soft', { now: T0 + 1, changedBy: 'owner' });
    expect(soft).toEqual({ state: 'soft', changedAt: T0 + 1, changedBy: 'owner' });
    expect(readCircuitBreaker(store).state).toBe('soft');

    // 2 of 4 tokens used; softLimit 3, so one soft-mode search still fits.
    const softAllowed = consume();
    expect(softAllowed.allowed).toBe(true);
    expect(softAllowed.reason).toBe('soft');
    expect(softAllowed.delayMs).toBe(1_500);
    expect(softAllowed.retryAfterMs).toBe(1_500);

    // Third token reaches softLimit -> refuse, but with the delay script.
    const softRefused = consume();
    expect(softRefused.allowed).toBe(false);
    expect(softRefused.reason).toBe('soft');
    expect(softRefused.delayMs).toBe(1_500);
    expect(softRefused.retryAfterMs).toBeGreaterThan(0);

    setCircuitBreaker(store, 'hard', { now: T0 + 2 });
    const hard = consume();
    expect(hard.allowed).toBe(false);
    expect(hard.reason).toBe('hard');
    expect(hard.delayMs).toBe(0);
    expect(Number.isFinite(hard.retryAfterMs)).toBe(true);
    expect(hard.retryAfterMs).toBeGreaterThan(0);

    setCircuitBreaker(store, 'closed', { now: T0 + 3 });
    expect(readCircuitBreaker(store).state).toBe('closed');
    expect(consume().allowed).toBe(true);
  });

  it('refuses every key in hard mode without burning tokens', () => {
    const store = new MemoryRateLimitStore();
    setCircuitBreaker(store, 'hard', { now: T0 });

    const a = shape(store, 'ip-a');
    const b = shape(store, 'ip-b');
    expect(a.reason).toBe('hard');
    expect(b.reason).toBe('hard');
    expect(a.remaining).toBe(RULE.limit);

    setCircuitBreaker(store, 'closed', { now: T0 + 1 });
    const reopened = consumeRateLimit(store, 'search', 'ip-a', RULE, { now: T0 + 1 });
    expect(reopened.allowed).toBe(true);
    expect(reopened.remaining).toBe(2);
  });

  it('defaults an unknown stored state back to closed', () => {
    const broken: RateLimitStore = {
      getBucket: () => undefined,
      putBucket: () => {},
      getBreaker: () => ({ state: 'nope' as never, changedAt: 0 }),
      putBreaker: () => {},
    };
    expect(readCircuitBreaker(broken).state).toBe('closed');
  });

  it('rejects an invalid runtime state from an admin request', () => {
    const store = new MemoryRateLimitStore();
    expect(() => setCircuitBreaker(store, 'off' as never)).toThrow(RangeError);
  });

  it('ships a documented default rule', () => {
    expect(SEARCH_RATE_LIMIT_RULE).toEqual({
      limit: 20,
      windowMs: 600_000,
      softLimit: 5,
      softDelayMs: 2_500,
    });
  });
});

describe('rate-limit store swap and dashboard helpers', () => {
  it('produces identical decisions on two different store implementations', () => {
    const memory = new MemoryRateLimitStore();
    const swapped = new MapStore();
    const sequence = [
      T0,
      T0,
      T0,
      T0 + 500,
      T0 + 1_000,
    ];
    const left = sequence.map((now) => consumeRateLimit(memory, 'search', 'ip-9', RULE, { now }));
    const right = sequence.map((now) => consumeRateLimit(swapped, 'search', 'ip-9', RULE, { now }));

    expect(right.map((d) => [d.allowed, d.reason, d.remaining, d.used, d.retryAfterMs]))
      .toEqual(left.map((d) => [d.allowed, d.reason, d.remaining, d.used, d.retryAfterMs]));
  });

  it('works with a minimal store that omits the optional daily methods', () => {
    const minimal: RateLimitStore = {
      getBucket: () => undefined,
      putBucket: () => {},
      getBreaker: () => undefined,
      putBreaker: () => {},
    };
    expect(consumeRateLimit(minimal, 'search', 'ip-1', RULE, { now: T0 }).allowed).toBe(true);
    expect(readDailyCount(minimal, 'search', T0)).toBeUndefined();
  });

  it('counts allowed searches per day for the dashboard', () => {
    const store = new MemoryRateLimitStore();
    const rule: RateLimitRule = { limit: 10, windowMs: 60_000 };
    consumeRateLimit(store, 'search', 'ip-1', rule, { now: T0 });
    consumeRateLimit(store, 'search', 'ip-1', rule, { now: T0 });

    setCircuitBreaker(store, 'soft', { now: T0 });
    consumeRateLimit(store, 'search', 'ip-1', { ...rule, softLimit: 5 }, { now: T0 }); // allowed soft
    consumeRateLimit(store, 'search', 'ip-1', { ...rule, softLimit: 2 }, { now: T0 }); // refused

    expect(dayKey(T0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readDailyCount(store, 'search', T0)).toBe(3);
    expect(readDailyCount(store, 'tts', T0)).toBe(0);
  });
});
