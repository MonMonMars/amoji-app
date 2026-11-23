/**
 * Client-side, device-local budget for the OPTIONAL Jamendo API search.
 *
 * The primary music path (the curated keyless track list on PR #574) costs
 * nothing and is never gated by this module. Only the API-search provider —
 * the one that needs `NEXT_PUBLIC_JAMENDO_CLIENT_ID` and shares one quota
 * across every listener — is meant to consult this budget.
 *
 * This tier is ADVISORY, NOT ENFORCEMENT. It lives in localStorage, so anyone
 * who clears storage (or opens a private window) starts from zero. It exists to
 * (a) soften bursts for well-behaved clients and (b) give the character a
 * reason to talk for a moment before a search. Real enforcement is the server
 * tier in `server/backend/src/rate-limit.ts`.
 *
 * Design rules:
 *  · injectable clock — no `Date.now()` buried in logic;
 *  · injectable storage — localStorage in the browser, memory in tests/SSR;
 *  · corrupt JSON self-heals instead of throwing;
 *  · no top-level `window` / `localStorage` access, so static rendering is safe;
 *  · the soft tier DELAYS, it does not refuse — the owner asked for a long
 *    spoken line to cover the wait. The caller speaks for `delayMs` and then
 *    continues. Only the hard tier refuses.
 *
 * Intended call site (deliberately NOT wired in this PR): the API-search branch
 * in `lib/music.ts` / the provider seam in `lib/music-stream-providers.ts`
 * (PR #574). The speech itself belongs to `lib/voice.ts` + `lib/fillers.ts`
 * and is owned by another agent — this module only supplies the number.
 */

export const SEARCH_BUDGET_STORAGE_KEY = 'amoji.searchBudget.v1';

/** Defaults: 20 searches / 10 min start the spoken delay; 30 refuse outright. */
export const DEFAULT_SEARCH_BUDGET_CONFIG: SearchBudgetConfig = Object.freeze({
  windowMs: 10 * 60_000,
  softMax: 20,
  hardMax: 30,
  softDelayMs: 2_500,
});

export interface SearchBudgetConfig {
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** At or above this many searches in the window, searches are delayed. */
  softMax: number;
  /** At or above this many searches in the window, searches are refused. */
  hardMax: number;
  /** How long the character should talk before a soft-tier search runs. */
  softDelayMs: number;
}

/** Minimal storage seam. The caller owns persistence. */
export interface SearchBudgetStorage {
  read(): string | null;
  write(value: string): void;
}

export type SearchBudgetTier = 'normal' | 'soft' | 'hard';

export interface SearchBudgetVerdict {
  /** `true` means the caller may search (immediately for normal, after `delayMs` for soft). */
  allowed: boolean;
  tier: SearchBudgetTier;
  /** `'soft'` here means "delayed", not "refused". `null` when normal. */
  reason: 'soft' | 'hard' | null;
  /** Searches counted in the window; for `take()` this includes the current one. */
  used: number;
  /** Hard ceiling (== `config.hardMax`). */
  max: number;
  softMax: number;
  remaining: number;
  /** Milliseconds to speak before searching. Non-zero only on the soft tier. */
  delayMs: number;
  /** Earliest re-attempt hint. 0 when normal; `delayMs` when soft; window-based when hard. */
  retryAfterMs: number;
  windowMs: number;
}

interface Stamp {
  t: number;
}

function writeStamps(storage: SearchBudgetStorage, stamps: number[]): void {
  const body = JSON.stringify(stamps.map((t): Stamp => ({ t })));
  try {
    storage.write(body);
  } catch {
    // Private mode / quota / a hostile adapter: the budget is advisory anyway.
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Reads, validates, self-heals, prunes, and sorts timestamps.
 * Corrupt JSON or junk entries reset to an empty list and rewrite the store.
 */
function readStamps(
  storage: SearchBudgetStorage,
  config: SearchBudgetConfig,
  now: number,
): number[] {
  let raw: string | null = null;
  try {
    raw = storage.read();
  } catch {
    raw = null;
  }
  if (raw === null || raw === '') return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    writeStamps(storage, []);
    return [];
  }
  if (!Array.isArray(parsed)) {
    writeStamps(storage, []);
    return [];
  }

  const stamps: number[] = [];
  let dirty = false;
  for (const entry of parsed) {
    if (entry && typeof entry === 'object' && isFiniteNumber((entry as Stamp).t)) {
      const stamp = (entry as Stamp).t;
      if (stamp > now) {
        // Clamp future stamps (clock skew / tampering) so they cannot pin the window.
        stamps.push(now);
        dirty = true;
      } else {
        stamps.push(stamp);
      }
    } else {
      dirty = true;
    }
  }
  const pruned = prune(stamps, config, now);
  if (dirty) writeStamps(storage, pruned);
  return pruned;
}

function prune(stamps: number[], config: SearchBudgetConfig, now: number): number[] {
  const cutoff = now - config.windowMs;
  return stamps.filter((t) => t > cutoff).sort((a, b) => a - b);
}

function appendStamp(
  storage: SearchBudgetStorage,
  config: SearchBudgetConfig,
  now: number,
  stamps: number[],
): number[] {
  const next = [...stamps, now];
  writeStamps(storage, next);
  return next;
}

function msToExpire(stamps: number[], index: number, config: SearchBudgetConfig, now: number): number {
  const target = stamps[index];
  if (target === undefined) return 1;
  return Math.max(1, Math.ceil(target + config.windowMs - now));
}

function verdict(
  config: SearchBudgetConfig,
  tier: SearchBudgetTier,
  used: number,
  retryAfterMs: number,
  delayMs: number,
): SearchBudgetVerdict {
  return {
    allowed: tier !== 'hard',
    tier,
    reason: tier === 'normal' ? null : tier,
    used,
    max: config.hardMax,
    softMax: config.softMax,
    remaining: Math.max(0, config.hardMax - used),
    delayMs,
    retryAfterMs,
    windowMs: config.windowMs,
  };
}

function tierFor(config: SearchBudgetConfig, used: number): SearchBudgetTier {
  if (used >= config.hardMax) return 'hard';
  if (used >= config.softMax) return 'soft';
  return 'normal';
}

export function normalizeSearchBudgetConfig(
  override: Partial<SearchBudgetConfig> = {},
): SearchBudgetConfig {
  const config: SearchBudgetConfig = { ...DEFAULT_SEARCH_BUDGET_CONFIG, ...override };
  if (!isFiniteNumber(config.windowMs) || config.windowMs <= 0) {
    throw new RangeError('search-budget: windowMs must be a positive finite number');
  }
  if (!Number.isInteger(config.softMax) || config.softMax < 1) {
    throw new RangeError('search-budget: softMax must be an integer >= 1');
  }
  if (!Number.isInteger(config.hardMax) || config.hardMax < config.softMax) {
    throw new RangeError('search-budget: hardMax must be an integer >= softMax');
  }
  if (!isFiniteNumber(config.softDelayMs) || config.softDelayMs < 0) {
    throw new RangeError('search-budget: softDelayMs must be a finite number >= 0');
  }
  return config;
}

/** In-memory adapter. One fresh adapter is a fresh budget — useful in tests. */
export function memorySearchBudgetStorage(seed: string | null = null): SearchBudgetStorage {
  let value: string | null = seed;
  return {
    read: () => value,
    write: (next: string) => {
      value = next;
    },
  };
}

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): WebStorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    const candidate = (window as unknown as { localStorage?: WebStorageLike }).localStorage;
    return candidate ?? null;
  } catch {
    // Some embedded webviews throw on localStorage access.
    return null;
  }
}

/**
 * localStorage adapter. Reads/writes are wrapped because Safari private mode
 * throws on write; a broken store must never break a search.
 */
export function localStorageSearchBudgetStorage(
  key: string = SEARCH_BUDGET_STORAGE_KEY,
): SearchBudgetStorage {
  return {
    read(): string | null {
      const ls = browserStorage();
      if (!ls) return null;
      try {
        return ls.getItem(key);
      } catch {
        return null;
      }
    },
    write(value: string): void {
      const ls = browserStorage();
      if (!ls) return;
      try {
        ls.setItem(key, value);
      } catch {
        // Quota / private mode: advisory budget simply does not persist.
      }
    },
  };
}

/**
 * The default adapter: localStorage in a browser, a throwaway memory store
 * during static render or tests. Never touches `window` at module scope.
 */
export function defaultSearchBudgetStorage(
  key: string = SEARCH_BUDGET_STORAGE_KEY,
): SearchBudgetStorage {
  return browserStorage() ? localStorageSearchBudgetStorage(key) : memorySearchBudgetStorage();
}

export interface SearchBudgetOptions {
  config?: Partial<SearchBudgetConfig>;
  storage?: SearchBudgetStorage;
  /** Injectable clock. Defaults to `Date.now`, the only place it is read. */
  now?: () => number;
}

export interface SearchBudget {
  readonly config: SearchBudgetConfig;
  /** Pure read — does not count the attempt. */
  check(): SearchBudgetVerdict;
  /**
   * Evaluates and, unless the hard tier refuses, records the attempt.
   * Soft returns `allowed: true` with `delayMs`: speak, then search.
   */
  take(): SearchBudgetVerdict;
  reset(): void;
  used(): number;
}

export function createSearchBudget(options: SearchBudgetOptions = {}): SearchBudget {
  const config = normalizeSearchBudgetConfig(options.config);
  const storage = options.storage ?? defaultSearchBudgetStorage();
  const clock = options.now ?? (() => Date.now());

  const checkAt = (now: number): SearchBudgetVerdict => {
    const stamps = readStamps(storage, config, now);
    const tier = tierFor(config, stamps.length);
    if (tier === 'hard') {
      // Need `length - hardMax + 1` stamps to expire for the count to fall
      // back to hardMax - 1; the first of those is at index `length - hardMax`.
      const retryAfterMs = msToExpire(stamps, Math.max(0, stamps.length - config.hardMax), config, now);
      return verdict(config, 'hard', stamps.length, retryAfterMs, 0);
    }
    if (tier === 'soft') {
      return verdict(config, 'soft', stamps.length, config.softDelayMs, config.softDelayMs);
    }
    return verdict(config, 'normal', stamps.length, 0, 0);
  };

  return {
    config,
    check: () => checkAt(clock()),
    take: () => {
      const now = clock();
      const current = checkAt(now);
      if (current.tier === 'hard') return current;
      const stamps = readStamps(storage, config, now);
      appendStamp(storage, config, now, stamps);
      const used = stamps.length + 1;
      return verdict(
        config,
        current.tier,
        used,
        current.tier === 'soft' ? config.softDelayMs : 0,
        current.tier === 'soft' ? config.softDelayMs : 0,
      );
    },
    reset: () => writeStamps(storage, []),
    used: () => readStamps(storage, config, clock()).length,
  };
}
