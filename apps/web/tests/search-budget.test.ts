import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SEARCH_BUDGET_CONFIG,
  SEARCH_BUDGET_STORAGE_KEY,
  createSearchBudget,
  defaultSearchBudgetStorage,
  localStorageSearchBudgetStorage,
  memorySearchBudgetStorage,
  normalizeSearchBudgetConfig,
  type SearchBudgetConfig,
} from '../lib/search-budget';

const CONFIG: Partial<SearchBudgetConfig> = {
  windowMs: 60_000,
  softMax: 3,
  hardMax: 5,
  softDelayMs: 2_000,
};

const T0 = 1_700_000_000_000;

function fixedBudget(seed: string | null = null) {
  let now = T0;
  const storage = memorySearchBudgetStorage(seed);
  const budget = createSearchBudget({
    config: CONFIG,
    storage,
    now: () => now,
  });
  return {
    budget,
    storage,
    advance(ms: number) {
      now += ms;
    },
    at() {
      return now;
    },
  };
}

function stored(storage: { read(): string | null }): unknown {
  return JSON.parse(storage.read() ?? '[]') as unknown;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('search-budget defaults', () => {
  it('ships the documented 20 / 30 / 10 min thresholds', () => {
    expect(DEFAULT_SEARCH_BUDGET_CONFIG).toEqual({
      windowMs: 600_000,
      softMax: 20,
      hardMax: 30,
      softDelayMs: 2_500,
    });
  });

  it('rejects an inverted or nonsensical config', () => {
    expect(() => normalizeSearchBudgetConfig({ softMax: 9, hardMax: 4 })).toThrow(RangeError);
    expect(() => normalizeSearchBudgetConfig({ windowMs: 0 })).toThrow(RangeError);
    expect(() => normalizeSearchBudgetConfig({ softDelayMs: -1 })).toThrow(RangeError);
  });
});

describe('search-budget tiers', () => {
  it('starts fresh and normal', () => {
    const { budget } = fixedBudget();
    const check = budget.check();
    expect(check.allowed).toBe(true);
    expect(check.tier).toBe('normal');
    expect(check.reason).toBeNull();
    expect(check.used).toBe(0);
    expect(check.max).toBe(5);
    expect(check.remaining).toBe(5);
    expect(check.delayMs).toBe(0);
  });

  it('allows up to softMax without a delay, then delays instead of refusing', () => {
    const { budget } = fixedBudget();
    expect(budget.take().tier).toBe('normal');
    expect(budget.take().tier).toBe('normal');
    expect(budget.take().tier).toBe('normal');

    const soft = budget.take();
    expect(soft.allowed).toBe(true);
    expect(soft.tier).toBe('soft');
    expect(soft.reason).toBe('soft');
    expect(soft.delayMs).toBe(2_000);
    expect(soft.retryAfterMs).toBe(2_000);
    expect(soft.used).toBe(4);
    expect(soft.remaining).toBe(1);

    // Still soft at the hard ceiling minus one, but never refused.
    const lastSoft = budget.take();
    expect(lastSoft.allowed).toBe(true);
    expect(lastSoft.tier).toBe('soft');
    expect(lastSoft.used).toBe(5);
    expect(lastSoft.remaining).toBe(0);
  });

  it('hard-refuses at the ceiling and reports when the oldest stamp expires', () => {
    const { budget, advance } = fixedBudget();
    for (let i = 0; i < 5; i += 1) budget.take();

    const hard = budget.take();
    expect(hard.allowed).toBe(false);
    expect(hard.tier).toBe('hard');
    expect(hard.reason).toBe('hard');
    expect(hard.used).toBe(5);
    expect(hard.remaining).toBe(0);
    expect(hard.delayMs).toBe(0);
    expect(hard.retryAfterMs).toBe(60_000);

    advance(15_000);
    expect(budget.check().retryAfterMs).toBe(45_000);

    // Hard refusals are not recorded, so the clock alone frees the budget.
    expect(budget.used()).toBe(5);
  });

  it('expires the sliding window exactly at windowMs', () => {
    const { budget, advance } = fixedBudget();
    budget.take(); // T0
    advance(1_000);
    for (let i = 0; i < 4; i += 1) budget.take(); // T0 + 1s
    expect(budget.check().tier).toBe('hard');

    advance(58_999); // T0 + 59_999: the T0 stamp is still inside
    expect(budget.check().tier).toBe('hard');

    advance(1); // T0 + 60_000 == T0 + windowMs -> the T0 stamp expires
    const after = budget.check();
    expect(after.tier).toBe('soft');
    expect(after.used).toBe(4);
    expect(after.allowed).toBe(true);
    expect(after.retryAfterMs).toBe(2_000);

    advance(1_000); // T0 + 61_000 -> every stamp is gone
    const empty = budget.check();
    expect(empty.tier).toBe('normal');
    expect(empty.used).toBe(0);
  });

  it('reports the stamp that must expire when the window is over-filled', () => {
    // Seed six stamps at T0 - 10s so the hard verdict must wait for the
    // (length - hardMax)-th oldest (index 1), not always the first.
    const seed = JSON.stringify([
      { t: T0 - 10_000 },
      { t: T0 - 9_000 },
      { t: T0 - 8_000 },
      { t: T0 - 7_000 },
      { t: T0 - 6_000 },
      { t: T0 - 5_000 },
    ]);
    const { budget, storage } = fixedBudget(seed);
    expect(stored(storage)).toHaveLength(6);
    const hard = budget.check();
    expect(hard.tier).toBe('hard');
    // Drop two stamps to reach 4 (below hardMax 5): index 1 expires at
    // T0 - 9000 + 60000 = T0 + 51000.
    expect(hard.retryAfterMs).toBe(51_000);
  });
});

describe('search-budget storage hygiene', () => {
  it.each(['not json at all', 'null', '{}', '42', '"nope"'])(
    'self-heals corrupt payload %j instead of throwing',
    (seed) => {
      const { budget, storage } = fixedBudget(seed);
      const result = budget.take();
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
      expect(Array.isArray(stored(storage))).toBe(true);
      expect(stored(storage)).toHaveLength(1);
    },
  );

  it('drops junk entries but keeps valid stamps', () => {
    const seed = JSON.stringify([{ t: T0 - 1_000 }, { nope: 1 }, { t: 'x' }, null]);
    const { budget, storage } = fixedBudget(seed);
    expect(budget.check().used).toBe(1);
    expect(stored(storage)).toHaveLength(1);
  });

  it('clamps future stamps so clock skew cannot lock the budget forever', () => {
    const seed = JSON.stringify([{ t: T0 + 9_999_999 }]);
    const { budget, storage } = fixedBudget(seed);
    expect(budget.check().used).toBe(1);
    expect(stored(storage)).toEqual([{ t: T0 }]);
  });

  it('never throws when the adapter write throws', () => {
    const storage = {
      read: () => null,
      write: () => {
        throw new Error('quota');
      },
    };
    const budget = createSearchBudget({ config: CONFIG, storage, now: () => T0 });
    // The verdict still counts the attempt; persistence simply stays empty.
    expect(budget.take().used).toBe(1);
    expect(budget.used()).toBe(0);
  });

  it('is advisory, not enforcement: a fresh adapter starts at zero', () => {
    const first = createSearchBudget({ config: CONFIG, now: () => T0 });
    first.take();
    first.take();
    first.take();
    expect(first.used()).toBe(3);

    const second = createSearchBudget({ config: CONFIG, now: () => T0 });
    const fresh = second.check();
    expect(fresh.used).toBe(0);
    expect(fresh.tier).toBe('normal');
    expect(fresh.remaining).toBe(5);
  });
});

describe('search-budget SSR and localStorage adapter', () => {
  it('works during static render with no window or localStorage', () => {
    expect(typeof window).toBe('undefined');
    const budget = createSearchBudget({ config: CONFIG, now: () => T0 });
    expect(() => budget.check()).not.toThrow();
    expect(budget.take().allowed).toBe(true);
    // Default adapter falls back to memory, so no browser globals are required.
    expect(localStorageSearchBudgetStorage().read()).toBeNull();
    expect(defaultSearchBudgetStorage().read()).toBeNull();
  });

  it('persists through the localStorage adapter when a browser exists', () => {
    const store = new Map<string, string>();
    const ls = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    };
    vi.stubGlobal('window', { localStorage: ls });

    const budget = createSearchBudget({
      config: CONFIG,
      storage: localStorageSearchBudgetStorage('test.budget'),
      now: () => T0,
    });
    budget.take();
    expect(ls.setItem).toHaveBeenCalledWith('test.budget', JSON.stringify([{ t: T0 }]));
    expect(store.get('test.budget')).toBe(JSON.stringify([{ t: T0 }]));

    budget.reset();
    expect(store.get('test.budget')).toBe('[]');
    expect(SEARCH_BUDGET_STORAGE_KEY).toBe('amoji.searchBudget.v1');
  });
});
