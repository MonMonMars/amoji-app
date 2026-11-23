'use client';
/**
 * Client side of the search gate: local advisory budget + server breaker.
 *
 * The owner asked for three things and this module is where the client honours
 * all three:
 *   · a hard limit the owner controls from the admin page — `/api/search`
 *     answers 429 and we fall back to the curated keyless list;
 *   · warnings when too many people search — computed server-side from the
 *     same counters this module increments;
 *   · "delay the search… let the character say something long" — `soft`
 *     returns `delayMs`, she speaks `pickSearchDelayLine(lang)`, then the
 *     search continues.
 *
 * NON-NEGOTIABLE: with no `NEXT_PUBLIC_AMOJI_API` (the published GitHub Pages
 * build) this function returns the `off` verdict before reading the budget,
 * before touching `fetch`, and before any timers. The demo behaves exactly as
 * it does today; there is no new failure mode and no new latency.
 *
 * Nothing here ever throws: a broken budget store, a dead backend, or a
 * non-JSON response degrades to "let the local path continue".
 */
import { productionApiBase } from './backend-client';
import { pickSearchDelayLine } from './fillers';
import {
  createSearchBudget,
  type SearchBudget,
  type SearchBudgetVerdict,
} from './search-budget';

/** Upper bound for the gate request. A slow backend must not stall a turn. */
export const SEARCH_GATE_TIMEOUT_MS = 4_000;

export interface SearchQuotaSnapshot {
  breaker: string;
  allowed: boolean;
  reason: string;
  limit: number;
  remaining: number;
  used: number;
  resetAt: number;
  retryAfterMs: number;
  delayMs: number;
  windowSeconds?: number;
}

export interface SearchGateVerdict {
  /**
   * `'api'` — an API search may run now.
   * `'curated'` — use the keyless curated list (today's default path).
   */
  lane: 'api' | 'curated';
  proceed: boolean;
  mode: 'off' | 'ok' | 'soft' | 'hard' | 'refused' | 'error';
  source: 'none' | 'budget' | 'server' | 'network';
  /** How long the character speaks before the search runs (soft only). */
  delayMs: number;
  /** Line to say during a soft delay; empty when there is no delay. */
  fillerLine: string;
  retryAfterMs: number;
  tracks: unknown[];
  quota: SearchQuotaSnapshot | null;
}

export interface SearchGateOptions {
  lang?: string;
  /** Injected in tests; defaults to the shared localStorage budget. */
  budget?: SearchBudget;
  fetchImpl?: typeof fetch;
  /** Existing voice path: say one line in her voice. */
  speak?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

let shared: SearchBudget | null = null;

function sharedBudget(): SearchBudget {
  if (!shared) shared = createSearchBudget();
  return shared;
}

/** True only when the build was pointed at a production API origin. */
export function searchGateConfigured(): boolean {
  return productionApiBase() !== '';
}

function offVerdict(): SearchGateVerdict {
  return {
    lane: 'curated',
    proceed: false,
    mode: 'off',
    source: 'none',
    delayMs: 0,
    fillerLine: '',
    retryAfterMs: 0,
    tracks: [],
    quota: null,
  };
}

function fromBudgetHard(verdict: SearchBudgetVerdict): SearchGateVerdict {
  return {
    lane: 'curated',
    proceed: false,
    mode: 'hard',
    source: 'budget',
    delayMs: 0,
    fillerLine: '',
    retryAfterMs: Math.max(1, verdict.retryAfterMs),
    tracks: [],
    quota: null,
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function snapshot(value: unknown): SearchQuotaSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const q = value as Record<string, unknown>;
  return {
    breaker: typeof q.breaker === 'string' ? q.breaker : 'closed',
    allowed: q.allowed === true,
    reason: typeof q.reason === 'string' ? q.reason : 'ok',
    limit: num(q.limit),
    remaining: num(q.remaining),
    used: num(q.used),
    resetAt: num(q.resetAt),
    retryAfterMs: num(q.retryAfterMs),
    delayMs: num(q.delayMs),
    ...(typeof q.windowSeconds === 'number' ? { windowSeconds: q.windowSeconds } : {}),
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

async function postSearch(
  base: string,
  query: string,
  fetchImpl: typeof fetch,
): Promise<Response | null> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), SEARCH_GATE_TIMEOUT_MS)
    : null;
  try {
    return await fetchImpl(`${base}/api/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: query }),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Gate one API search. Never throws.
 *
 * Call it BEFORE the provider request. `lane === 'curated'` means "do not make
 * the API request; play the keyless curated list instead". When the build has
 * no API origin this returns `off` synchronously-in-effect (a resolved promise
 * with no I/O, no budget write, no timer).
 */
export async function beginSearch(
  query: string,
  options: SearchGateOptions = {},
): Promise<SearchGateVerdict> {
  const base = productionApiBase();
  const fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!base || !fetchImpl) return offVerdict();

  const sleep = options.sleep ?? defaultSleep;
  const speak = (line: string): void => {
    if (!line || !options.speak) return;
    try {
      options.speak(line);
    } catch {
      // A broken voice path must never block playback.
    }
  };

  let local: SearchBudgetVerdict;
  try {
    local = (options.budget ?? sharedBudget()).take();
  } catch {
    // A corrupt/throwing budget store degrades to "allow", like today.
    local = {
      allowed: true,
      tier: 'normal',
      reason: null,
      used: 0,
      max: 0,
      softMax: 0,
      remaining: 0,
      delayMs: 0,
      retryAfterMs: 0,
      windowMs: 0,
    };
  }
  if (local.tier === 'hard') return fromBudgetHard(local);

  const res = await postSearch(base, query, fetchImpl);
  if (!res) {
    // Backend unreachable: ignore the server verdict, the local budget already
    // said this attempt is allowed. Curated playback is never blocked.
    return {
      lane: 'api',
      proceed: true,
      mode: 'error',
      source: 'network',
      delayMs: 0,
      fillerLine: '',
      retryAfterMs: 0,
      tracks: [],
      quota: null,
    };
  }

  if (res.status === 429) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json() as Record<string, unknown>;
    } catch {
      body = {};
    }
    const quota = snapshot(body.quota);
    const hard = body.breaker === 'hard' || body.reason === 'hard';
    return {
      lane: 'curated',
      proceed: false,
      mode: hard ? 'hard' : 'refused',
      source: 'server',
      delayMs: 0,
      fillerLine: '',
      retryAfterMs: Math.max(1, num(body.retryAfterMs, quota?.retryAfterMs ?? 1)),
      tracks: [],
      quota,
    };
  }

  if (!res.ok) {
    // 5xx / 4xx that is not a breaker verdict: do not punish the user.
    return {
      lane: 'api',
      proceed: true,
      mode: 'error',
      source: 'server',
      delayMs: 0,
      fillerLine: '',
      retryAfterMs: 0,
      tracks: [],
      quota: null,
    };
  }

  let body: Record<string, unknown> = {};
  try {
    body = await res.json() as Record<string, unknown>;
  } catch {
    body = {};
  }
  const quota = snapshot(body.quota);
  const tracks = Array.isArray(body.tracks) ? body.tracks : [];

  const delayMs = Math.max(0, num(body.delayMs), local.tier === 'soft' ? local.delayMs : 0);
  if (delayMs > 0) {
    const fillerLine = pickSearchDelayLine(options.lang ?? 'en');
    speak(fillerLine);
    await sleep(delayMs);
    return {
      lane: 'api',
      proceed: true,
      mode: 'soft',
      source: 'server',
      delayMs,
      fillerLine,
      retryAfterMs: num(body.retryAfterMs, delayMs),
      tracks,
      quota,
    };
  }

  return {
    lane: 'api',
    proceed: true,
    mode: 'ok',
    source: 'server',
    delayMs: 0,
    fillerLine: '',
    retryAfterMs: num(body.retryAfterMs),
    tracks,
    quota,
  };
}
