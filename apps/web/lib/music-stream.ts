/**
 * Search-driven music streaming — provider-agnostic client.
 *
 * WHY THIS EXISTS
 * Her dance and lip-sync features read the actual audio samples through
 * `AnalyserNode`. `lib/music.ts` documents the constraint: a cross-origin
 * `<audio>` whose bytes are not CORS-readable is SILENT once routed through
 * `createMediaElementSource`. So every track carries an `analysable` bit, and
 * `musicPlaybackPlan()` turns that bit into the only two legal playback
 * routings. Getting this wrong makes the app go quiet, which is exactly the
 * failure this layer exists to prevent.
 *
 * WHAT THIS FILE DOES NOT DO
 * It does not touch `music.ts`, `SharedAudio`, `CompanionCanvas`, the service
 * worker, or the revision stamp. Nothing imports it yet: it ships dark so the
 * integration PR (see `docs/MUSIC_STREAMING.md`) can be a small, reviewable
 * diff once the concurrent audio PRs have landed.
 *
 * LAZY BY DESIGN
 * No fetch at import time, no timers at import time, no `window` access. Every
 * network call is inside `search()`, and every provider call has an
 * AbortController timeout so a hanging provider cannot wedge the UI.
 */

import {
  CURATED_JAMENDO_TRACKS,
  PROVIDER_DEFAULT_LIMIT,
  PROVIDER_MAX_LIMIT,
  PROVIDER_ORDER,
  PROVIDER_SPECS,
  clampLimit,
  curatedJamendoForMood,
  curatedJamendoSearch,
  incompetechSearch,
  jamendoSearchUrl,
  parseJamendoResponse,
  parsePixabayResponse,
  pixabaySearchUrl,
  type CuratedMood,
  type MusicProviderId,
  type MusicSearchOpts,
  type MusicTrack,
  type ParseOutcome,
} from './music-stream-providers';

export type {
  CuratedMood,
  MusicProviderId,
  MusicSearchOpts,
  MusicTrack,
} from './music-stream-providers';
export {
  CURATED_JAMENDO_TRACKS,
  INCOMPETECH_TRACKS,
  JAMENDO_CURATED_TRACKS,
  JAMENDO_STORAGE_PROBE,
  PROVIDER_MAX_LIMIT,
  PROVIDER_ORDER,
  PROVIDER_SPECS,
  clampLimit,
  curatedJamendoForMood,
  curatedJamendoSearch,
  incompetechAttribution,
  incompetechStreamUrl,
  jamendoSearchUrl,
  parseJamendoResponse,
  parsePixabayResponse,
  pixabaySearchUrl,
} from './music-stream-providers';

/** Default per-provider timeout. A slow provider must never stall the picker. */
export const DEFAULT_TIMEOUT_MS = 8_000;

/** Search results are cached briefly; the CALLER owns keystroke debouncing. */
export const DEFAULT_CACHE_TTL_MS = 60_000;

export type MusicStreamFailureReason =
  | 'no-key'
  | 'no-api'
  | 'timeout'
  | 'network'
  | 'http'
  | 'parse'
  | 'provider-error';

/** Why a provider produced nothing. Shown as an honest note, never as fake tracks. */
export interface MusicStreamFailure {
  provider: MusicProviderId;
  reason: MusicStreamFailureReason;
  detail: string;
}

export interface MusicSearchResult {
  query: string;
  tracks: MusicTrack[];
  /** Empty when everything worked. Never thrown — always reported. */
  failures: MusicStreamFailure[];
  /** `true` when the whole result came from the in-memory cache. */
  fromCache: boolean;
}

/** Capability descriptor for UI: what can we do right now, and why not. */
export interface MusicProviderCapability {
  id: MusicProviderId;
  label: string;
  /** Env var the owner must set, or `null` when the provider needs no key. */
  keyEnv: string | null;
  keyPresent: boolean;
  /**
   * Truthful: `true` when this provider can answer *something* right now.
   * Jamendo stays available without a key because the curated catalog is
   * keyless — the key only unlocks text search.
   */
  available: boolean;
  /** `true` when a keyless curated catalog backs this provider. */
  keylessCatalog: boolean;
  /** `true` only when this provider's audio is CORS-readable (see provider spec). */
  audioAnalysable: boolean;
  licence: string;
  docsUrl: string;
  notes: string;
}

export interface MusicProvider {
  readonly id: MusicProviderId;
  readonly label: string;
  /** Truthful and synchronous: key present + not retired. No network. */
  available(): boolean;
  /** Rejects with `MusicStreamError` only when unavailable; otherwise never throws. */
  search(q: string, opts?: MusicSearchOpts): Promise<MusicTrack[]>;
  /** Mirrors `PROVIDER_SPECS[id].audioCors`. */
  readonly audioAnalysable: boolean;
}

/** Thrown only by a direct `provider.search()` on an unavailable provider. */
export class MusicStreamError extends Error {
  readonly reason: MusicStreamFailureReason;
  constructor(reason: MusicStreamFailureReason, message: string) {
    super(message);
    this.name = 'MusicStreamError';
    this.reason = reason;
  }
}

export interface MusicStreamDeps {
  /** Defaults to `process.env` (guarded for browsers). Tests pass an object. */
  env?: Record<string, string | undefined> | undefined;
  /** Defaults to global `fetch`. Tests inject a fake. */
  fetch?: FetchLike | undefined;
  /** Defaults to `Date.now`. */
  now?: (() => number) | undefined;
  timeoutMs?: number | undefined;
  cacheTtlMs?: number | undefined;
}

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text?: () => Promise<string>; json?: () => Promise<unknown> }>;

export interface MusicStream {
  /** Every provider, in preference order, available or not. */
  providers(): MusicProvider[];
  /** Capability rows for a picker/settings screen. */
  capabilities(): MusicProviderCapability[];
  /** Ids that would answer a search right now. */
  availableProviders(): MusicProviderId[];
  /**
   * The keyless catalog, in catalog order. This is the list a "play music"
   * button can use with no search box and no account.
   */
  curatedTracks(): readonly MusicTrack[];
  /** One shuffled curated track (bag rotation: every track once per pass). */
  nextCurated(): MusicTrack | null;
  /** Reset the rotation (used by tests and by a fresh session). */
  resetRotation(): void;
  /**
   * Fan out to every available provider in parallel.
   *
   * Contract:
   * - never throws, ever (a failed provider becomes a `failures` row);
   * - an EMPTY query is not a no-op any more: it returns a shuffled batch of
   *   the keyless catalog (no network). The curated catalog is the default
   *   source, so "just play something" has to work;
   * - results are merged in preference order, de-duplicated by id and URL;
   *   curated tracks come first, so a dead API never hides the catalog;
   * - successful results (including legitimately empty ones) are cached for
   *   `cacheTtlMs`; failures are never cached, so a transient timeout retries;
   * - attribution and `analysable` come from the provider, never from the caller.
   */
  search(q: string, opts?: MusicSearchOpts): Promise<MusicSearchResult>;
  clearCache(): void;
}

function readEnv(
  env: Record<string, string | undefined> | undefined,
): Record<string, string | undefined> {
  if (env) return env;
  if (typeof process !== 'undefined' && process.env) return process.env;
  return {};
}

function readKey(env: Record<string, string | undefined>, keyEnv: string | null): string {
  if (!keyEnv) return '';
  const raw = env[keyEnv];
  return typeof raw === 'string' ? raw.trim() : '';
}

function defaultFetch(): FetchLike | null {
  const g = globalThis as { fetch?: unknown };
  return typeof g.fetch === 'function' ? (g.fetch as FetchLike) : null;
}

/** Read a JSON body from either a real `Response` or a test double. */
async function readJson(res: {
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}): Promise<unknown> {
  if (typeof res.json === 'function') return res.json();
  if (typeof res.text === 'function') return JSON.parse(await res.text()) as unknown;
  throw new MusicStreamError('parse', 'response had no json()/text() body');
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}

interface FetchJsonOutcome {
  json?: unknown;
  failure?: MusicStreamFailure;
}

export function createMusicStream(deps: MusicStreamDeps = {}): MusicStream {
  const env = readEnv(deps.env);
  const now = deps.now ?? (() => Date.now());
  const timeoutMs =
    typeof deps.timeoutMs === 'number' && deps.timeoutMs > 0 ? deps.timeoutMs : DEFAULT_TIMEOUT_MS;
  const cacheTtlMs =
    typeof deps.cacheTtlMs === 'number' && deps.cacheTtlMs >= 0
      ? deps.cacheTtlMs
      : DEFAULT_CACHE_TTL_MS;

  /** key → { at, tracks } */
  const cache = new Map<string, { at: number; tracks: MusicTrack[] }>();

  // --- keyless catalog rotation (shuffle bag) ------------------------------
  let rotationQueue: MusicTrack[] = [];
  let rotationLastId: string | null = null;

  function refillRotation(): void {
    const next = [...CURATED_JAMENDO_TRACKS];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
    }
    // A new pass must not open with the track that closed the previous one.
    if (next.length > 1 && next[0]!.id === rotationLastId) {
      const first = next.shift()!;
      next.push(first);
    }
    rotationQueue = next;
  }

  function takeCurated(limit: number): MusicTrack[] {
    if (!CURATED_JAMENDO_TRACKS.length) return [];
    const out: MusicTrack[] = [];
    while (out.length < limit) {
      if (!rotationQueue.length) refillRotation();
      const track = rotationQueue.shift();
      if (!track) break;
      rotationLastId = track.id;
      out.push(track);
    }
    return out;
  }

  function keyFor(id: MusicProviderId, q: string, limit: number): string {
    return `${id}|${q.toLowerCase()}|${limit}`;
  }

  function available(id: MusicProviderId): boolean {
    const spec = PROVIDER_SPECS[id];
    if (spec.retired) return false;
    // jamendo is always available: the curated catalog needs no key and no
    // account (that was the owner's whole objection to an API-only design).
    if (id === 'jamendo') return true;
    if (!spec.keyEnv) return true;
    return readKey(env, spec.keyEnv).length > 0;
  }

  async function fetchJson(url: string, provider: MusicProviderId): Promise<FetchJsonOutcome> {
    const doFetch = deps.fetch ?? defaultFetch();
    if (!doFetch) {
      return {
        failure: { provider, reason: 'network', detail: 'no fetch implementation available' },
      };
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        // Abort first so the socket is actually torn down, then reject.
        try {
          controller.abort();
        } catch {
          /* ignore */
        }
        const err = new Error(`timeout after ${timeoutMs}ms`);
        err.name = 'AbortError';
        reject(err);
      }, timeoutMs);
    });
    try {
      const res = await Promise.race([
        doFetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        timeout,
      ]);
      if (!res.ok) {
        return {
          failure: { provider, reason: 'http', detail: `HTTP ${res.status}` },
        };
      }
      return { json: await readJson(res) };
    } catch (err) {
      if (isAbortError(err)) {
        return { failure: { provider, reason: 'timeout', detail: `timed out after ${timeoutMs}ms` } };
      }
      const detail = err instanceof Error ? err.message : 'network error';
      return { failure: { provider, reason: 'network', detail } };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Shared shape for the two key-gated JSON providers. */
  async function searchJsonProvider(
    provider: 'jamendo' | 'pixabay',
    q: string,
    limit: number,
  ): Promise<{ tracks: MusicTrack[]; failure?: MusicStreamFailure }> {
    const spec = PROVIDER_SPECS[provider];
    const key = readKey(env, spec.keyEnv);
    if (!key) {
      return {
        tracks: [],
        failure: {
          provider,
          reason: 'no-key',
          detail: `${spec.keyEnv ?? 'API key'} is not set`,
        },
      };
    }
    const url =
      provider === 'jamendo'
        ? jamendoSearchUrl({ clientId: key, query: q, limit })
        : pixabaySearchUrl({ apiKey: key, query: q, limit });
    const got = await fetchJson(url, provider);
    if (got.failure) return { tracks: [], failure: got.failure };
    const outcome: ParseOutcome =
      provider === 'jamendo' ? parseJamendoResponse(got.json) : parsePixabayResponse(got.json);
    if (outcome.error) {
      return {
        tracks: outcome.tracks,
        failure: {
          provider,
          reason: outcome.error.reason === 'parse' ? 'parse' : 'provider-error',
          detail: outcome.error.detail,
        },
      };
    }
    return { tracks: outcome.tracks };
  }

  async function providerSearch(
    id: MusicProviderId,
    q: string,
    limit: number,
  ): Promise<{ tracks: MusicTrack[]; failure?: MusicStreamFailure }> {
    const spec = PROVIDER_SPECS[id];
    if (spec.retired) {
      return {
        tracks: [],
        failure: { provider: id, reason: 'no-api', detail: `${spec.label} has no working public API` },
      };
    }
    if (id === 'incompetech') return { tracks: incompetechSearch(q, { limit }) };
    if (id === 'pixabay') return searchJsonProvider('pixabay', q, limit);
    if (id === 'jamendo') {
      // Curated first: it is keyless, instant and always present. The API only
      // adds to it, and a missing/refused key is NOT a user-visible failure when
      // the catalog already answered.
      const curated = curatedJamendoSearch(q, { limit });
      const key = readKey(env, spec.keyEnv);
      if (!key) {
        return curated.length
          ? { tracks: curated }
          : {
              tracks: [],
              failure: {
                provider: 'jamendo',
                reason: 'no-key',
                detail: `${spec.keyEnv ?? 'API key'} is not set and no curated track matched "${q}"`,
              },
            };
      }
      const api = await searchJsonProvider('jamendo', q, limit);
      const merged = [...curated];
      const seen = new Set(merged.map((t) => t.id));
      for (const track of api.tracks) {
        if (seen.has(track.id)) continue;
        seen.add(track.id);
        merged.push(track);
      }
      // A real API failure is still reported (diagnostics) even though the
      // curated catalog already answered — the UI shows tracks, not an error.
      if (api.failure) {
        return { tracks: merged.slice(0, limit), failure: api.failure };
      }
      if (merged.length) return { tracks: merged.slice(0, limit) };
      return { tracks: [] };
    }
    return { tracks: [], failure: { provider: id, reason: 'no-api', detail: 'unknown provider' } };
  }

  const providerObjects: MusicProvider[] = PROVIDER_ORDER.map((id) => {
    const spec = PROVIDER_SPECS[id];
    return {
      id,
      label: spec.label,
      audioAnalysable: spec.audioCors,
      available: () => available(id),
      search: async (q: string, opts?: MusicSearchOpts) => {
        const query = q.trim();
        if (!available(id)) {
          throw new MusicStreamError(
            spec.keyEnv && !readKey(env, spec.keyEnv) ? 'no-key' : 'no-api',
            `${spec.label} is unavailable: ${spec.keyEnv && !readKey(env, spec.keyEnv) ? `${spec.keyEnv} is not set` : spec.notes}`,
          );
        }
        if (!query) return [];
        const out = await providerSearch(id, query, clampLimit(opts?.limit));
        return out.tracks;
      },
    } satisfies MusicProvider;
  });

  return {
    providers: () => providerObjects.slice(),
    availableProviders: () => PROVIDER_ORDER.filter((id) => available(id)),
    capabilities: () =>
      PROVIDER_ORDER.map((id) => {
        const spec = PROVIDER_SPECS[id];
        const keyPresent = spec.keyEnv ? readKey(env, spec.keyEnv).length > 0 : true;
        return {
          id,
          label: spec.label,
          keyEnv: spec.keyEnv,
          keyPresent,
          available: available(id),
          keylessCatalog: id === 'jamendo',
          audioAnalysable: spec.audioCors,
          licence: spec.licence,
          docsUrl: spec.docsUrl,
          notes: spec.notes,
        } satisfies MusicProviderCapability;
      }),

    async search(q: string, opts?: MusicSearchOpts): Promise<MusicSearchResult> {
      const query = q.trim();
      const limit = clampLimit(opts?.limit);
      if (!query) {
        // The keyless catalog IS the default source, so "play something" must
        // work with no query: hand back a shuffled batch, no network involved.
        return { query, tracks: takeCurated(limit), failures: [], fromCache: false };
      }

      const requested =
        opts?.providers && opts.providers.length
          ? PROVIDER_ORDER.filter((id) => opts.providers!.includes(id))
          : [...PROVIDER_ORDER];
      const ids = requested.filter((id) => available(id));
      if (!ids.length) {
        const failures: MusicStreamFailure[] = requested.map((id) => {
          const spec = PROVIDER_SPECS[id];
          return {
            provider: id,
            reason: spec.retired ? 'no-api' : 'no-key',
            detail: spec.retired
              ? `${spec.label} has no working public API`
              : `${spec.keyEnv ?? 'API key'} is not set`,
          };
        });
        return { query, tracks: [], failures, fromCache: false };
      }

      const outcomes = await Promise.all(
        ids.map(async (id) => {
          const key = keyFor(id, query, limit);
          const hit = cache.get(key);
          if (hit && now() - hit.at < cacheTtlMs) {
            return { id, tracks: hit.tracks, failure: undefined, cached: true };
          }
          try {
            const out = await providerSearch(id, query, limit);
            if (!out.failure) {
              cache.set(key, { at: now(), tracks: out.tracks });
            }
            return { id, tracks: out.tracks, failure: out.failure, cached: false };
          } catch (err) {
            // Defensive: providerSearch is written not to throw, but a bug in a
            // parser must still surface as a reason, not as a rejected UI call.
            return {
              id,
              tracks: [] as MusicTrack[],
              failure: {
                provider: id,
                reason: 'provider-error' as MusicStreamFailureReason,
                detail: err instanceof Error ? err.message : 'provider threw',
              },
              cached: false,
            };
          }
        }),
      );

      const seenIds = new Set<string>();
      const seenUrls = new Set<string>();
      const tracks: MusicTrack[] = [];
      const failures: MusicStreamFailure[] = [];
      for (const row of outcomes) {
        if (row.failure) failures.push(row.failure);
        for (const t of row.tracks) {
          if (seenIds.has(t.id) || seenUrls.has(t.streamUrl)) continue;
          seenIds.add(t.id);
          seenUrls.add(t.streamUrl);
          tracks.push(t);
        }
      }
      return {
        query,
        tracks,
        failures,
        fromCache: outcomes.length > 0 && outcomes.every((r) => r.cached),
      };
    },

    clearCache() {
      cache.clear();
    },

    curatedTracks: () => CURATED_JAMENDO_TRACKS.slice(),
    nextCurated: () => takeCurated(1)[0] ?? null,
    resetRotation() {
      rotationQueue = [];
      rotationLastId = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Playback routing — the safety gate the integration MUST use
// ---------------------------------------------------------------------------

export type MusicPlaybackPlan =
  | {
      kind: 'analysable';
      url: string;
      /** Must be set BEFORE `src` is assigned, else the element cannot be tapped. */
      crossOrigin: 'anonymous';
      routeThroughAnalyser: true;
      why: string;
    }
  | {
      kind: 'untapped';
      url: string;
      crossOrigin: null;
      routeThroughAnalyser: false;
      why: string;
    };

/**
 * Decide how a track may be played.
 *
 * `analysable: true`  → set `crossOrigin='anonymous'`, then (and only then)
 *                       `createMediaElementSource` + `AnalyserNode` — dance
 *                       onsets, song lip-sync and the beat clock all work.
 * `analysable: false` → play a plain `<audio>` and DO NOT create a media source.
 *                       The track is audible, but there is no beat lock, so the
 *                       body must fall back to the known-tempo path.
 *
 * Even for `analysable: true`, the follow-up must still tolerate a load error
 * and retry without `crossOrigin` (provider CDN allowlists have been observed
 * to be inconsistent — see docs/MUSIC_STREAMING.md).
 */
export function musicPlaybackPlan(track: MusicTrack): MusicPlaybackPlan {
  if (track.analysable) {
    return {
      kind: 'analysable',
      url: track.streamUrl,
      crossOrigin: 'anonymous',
      routeThroughAnalyser: true,
      why: `${track.provider} audio is CORS-readable — safe to analyse (dance/lips)`,
    };
  }
  return {
    kind: 'untapped',
    url: track.streamUrl,
    crossOrigin: null,
    routeThroughAnalyser: false,
    why: `${track.provider} audio is not CORS-readable — play untapped, no beat lock`,
  };
}

/** One-line credit for UI. Never drop this: these licences require attribution. */
export function musicAttributionLine(track: MusicTrack): string {
  return track.attribution.trim();
}

/** Process-wide instance for call sites that do not need injection. */
let shared: MusicStream | null = null;

export function musicStream(): MusicStream {
  if (!shared) shared = createMusicStream();
  return shared;
}

/** Convenience wrapper. Debounce at the call site (200–300 ms); this caches only. */
export function searchMusic(q: string, opts?: MusicSearchOpts): Promise<MusicSearchResult> {
  return musicStream().search(q, opts);
}

/** The keyless curated catalog (28 verified tracks) from the shared instance. */
export function curatedMusicTracks(): readonly MusicTrack[] {
  return musicStream().curatedTracks();
}

/** One shuffled curated track — use this for a bare "let's dance" request. */
export function nextCuratedMusicTrack(): MusicTrack | null {
  return musicStream().nextCurated();
}

/** Capability rows for settings / empty-state copy. */
export function musicStreamCapabilities(): MusicProviderCapability[] {
  return musicStream().capabilities();
}

/** @internal tests */
export function resetMusicStreamForTests(): void {
  shared = null;
}

export const MUSIC_STREAM_LIMITS = {
  defaultLimit: PROVIDER_DEFAULT_LIMIT,
  maxLimit: PROVIDER_MAX_LIMIT,
} as const;
