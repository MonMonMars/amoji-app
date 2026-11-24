/**
 * Provider table for search-driven music streaming.
 *
 * Scope: this file is DATA + PURE PARSERS only. No fetch, no timer, no
 * AudioContext, no window — the network client lives in `music-stream.ts` so
 * node tests can inject a fake fetch and so nothing here can leak side effects
 * into an import graph.
 *
 * The CORS claims below are MEASURED, not assumed. Literal response headers and
 * the commands used are recorded in `docs/MUSIC_STREAMING.md`. If a provider
 * changes its CDN headers, update the table there and flip `audioCors` here —
 * `analysable` on every returned track is derived from that one bit, and it is
 * the gate that decides whether the follow-up integration may route the audio
 * through an AnalyserNode (dance onsets + lip-sync) or must play it untapped.
 */

/** Providers in preference order. `fma` is deliberately last: it is dead. */
export type MusicProviderId = 'jamendo' | 'pixabay' | 'incompetech' | 'fma';

// The keyless, hand-verified Jamendo catalog lives in its own data module so the
// rows can be audited without reading the parser code.
export {
  JAMENDO_CURATED_TRACKS,
  JAMENDO_STORAGE_HOST,
  JAMENDO_STORAGE_PROBE,
  jamendoStreamUrl,
  moodForGenre,
  curatedTracksForMood,
  type CuratedJamendoTrack,
  type CuratedMood,
} from './music-stream-catalog';
import {
  JAMENDO_CURATED_TRACKS,
  jamendoStreamUrl,
  moodForGenre,
  type CuratedJamendoTrack,
  type CuratedMood,
} from './music-stream-catalog';

/**
 * One playable result. `analysable` is NOT a property of the track — it is a
 * property of the provider's MP3 CDN (see `ProviderSpec.audioCors`). Never set
 * it by hand at a call site.
 */
export interface MusicTrack {
  id: string;
  provider: MusicProviderId;
  /**
   * `null` when the provider gave us no title. NEVER fabricate one: an invented
   * title is both a lie in the UI and a broken CC attribution.
   */
  title: string | null;
  /** `null` when the provider gave us no artist name. */
  artist: string | null;
  /** `true` when title or artist is null — backfill from the API when a key exists. */
  metadataIncomplete: boolean;
  /**
   * `curated` = the keyless, individually verified catalog (no account needed).
   * `search` = a live provider query.
   */
  source: 'curated' | 'search';
  /** Track length in whole seconds. `0` means "the provider did not publish it". */
  durationSec: number;
  streamUrl: string;
  /** Human-readable licence name, e.g. `CC BY-SA 3.0`, `CC BY 4.0`, `Pixabay Content License`. */
  licence: string;
  /**
   * Attribution string that MUST be shown or spoken somewhere user-visible.
   * These are Creative Commons / attribution-only catalogues: stripping this is
   * a licence violation, not a cosmetic choice.
   */
  attribution: string;
  /**
   * `true` only when we verified that this provider's audio CDN sends a usable
   * `Access-Control-Allow-Origin`. `true` ⇒ safe to hand to
   * `createMediaElementSource` (dance/lip analysis works). `false` ⇒ play it
   * untapped; routing it through the analyser makes it SILENT.
   */
  analysable: boolean;
  /** ID3 genre of the file (curated) or the provider's first tag. null = unknown. */
  genre?: string | null;
  /** Coarse bucket derived from `genre`; deliberately null when unmapped. */
  mood?: CuratedMood | null;
  /** Provider page for the track, when published. Useful for the attribution link. */
  shareUrl?: string;
}

export interface MusicSearchOpts {
  /** Max tracks wanted from this provider. Clamped to 1..PROVIDER_MAX_LIMIT. */
  limit?: number;
  /**
   * Restrict which providers are queried (still subject to `available()`).
   * Omit to query every available provider in preference order. Callers that
   * only want the primary catalogue pass `['jamendo']`; callers that want the
   * keyless fallback merged in just omit this.
   */
  providers?: readonly MusicProviderId[];
}

/** Hard ceiling so a caller cannot ask a provider for 10 000 rows. */
export const PROVIDER_MAX_LIMIT = 50;
export const PROVIDER_DEFAULT_LIMIT = 12;

export interface ParseError {
  /** `provider-error` = the provider answered but refused (bad key, quota…). */
  reason: 'provider-error' | 'parse';
  detail: string;
}

export interface ParseOutcome {
  tracks: MusicTrack[];
  error?: ParseError;
}

export interface ProviderSpec {
  id: MusicProviderId;
  label: string;
  /** Env var holding the API key. `null` = no key needed. */
  keyEnv: string | null;
  /** `true` when the provider cannot be used at all (dead API). */
  retired: boolean;
  /**
   * `true` only when a real request from this machine got a usable
   * `Access-Control-Allow-Origin` on the provider's audio bytes.
   */
  audioCors: boolean;
  licence: string;
  docsUrl: string;
  /** Shown in capability UI / docs when the provider is unusable. */
  notes: string;
}

export const PROVIDER_SPECS: Record<MusicProviderId, ProviderSpec> = {
  jamendo: {
    id: 'jamendo',
    label: 'Jamendo',
    keyEnv: 'NEXT_PUBLIC_JAMENDO_CLIENT_ID',
    retired: false,
    // Verified 2026-11-24: MP3 CDN reflects the request Origin
    // (`Access-Control-Allow-Origin: https://amoji.test` for a test Origin).
    audioCors: true,
    licence: 'Creative Commons (per-track, see licence deed)',
    docsUrl: 'https://developer.jamendo.com/v3.0',
    notes:
      'Search API is CORS-open (`Access-Control-Allow-Origin: *`). A client_id from ' +
      'devportal.jamendo.com is required for every call, including search.',
  },
  pixabay: {
    id: 'pixabay',
    label: 'Pixabay Music',
    keyEnv: 'NEXT_PUBLIC_PIXABAY_API_KEY',
    retired: false,
    // Verified 2026-11-24: `Access-Control-Allow-Origin: *` on cdn.pixabay.com audio.
    audioCors: true,
    licence: 'Pixabay Content License',
    docsUrl: 'https://pixabay.com/api/docs/',
    notes:
      'Audio endpoint `https://pixabay.com/api/audio/` exists (it answers with Pixabay\'s own ' +
      'key error, not a 404) and is CORS-open, but its response schema could not be ' +
      'confirmed without a real key — the parser here is deliberately defensive.',
  },
  incompetech: {
    id: 'incompetech',
    label: 'Incompetech',
    keyEnv: null,
    retired: false,
    // Verified 2026-11-24: NO Access-Control-Allow-Origin header at all, plus
    // `Content-Type: application/octet-stream` and `Content-Disposition: attachment`.
    audioCors: false,
    licence: 'CC BY 4.0',
    docsUrl: 'https://incompetech.com/music/royalty-free/licenses/',
    notes:
      'No API: a small curated list of verified static MP3s. NOT CORS-open, so it can ' +
      'never feed the analyser — it is a no-key playback fallback only, and some browsers ' +
      'may refuse `Content-Disposition: attachment` audio.',
  },
  fma: {
    id: 'fma',
    label: 'Free Music Archive',
    keyEnv: null,
    retired: true,
    audioCors: false,
    licence: 'Per-track CC',
    docsUrl: 'https://freemusicarchive.org/',
    notes:
      'Public API discontinued: `api.freemusicarchive.org` no longer resolves and the legacy ' +
      '`/api/get/*.json` endpoints return 404. Kept as a retired row so nobody re-adds it.',
  },
};

/** Providers that are actually queryable, in preference order. */
export const PROVIDER_ORDER: readonly MusicProviderId[] = ['jamendo', 'pixabay', 'incompetech'];

// ---------------------------------------------------------------------------
// Curated, keyless Jamendo catalog — THE DEFAULT SOURCE
// ---------------------------------------------------------------------------

/**
 * The owner's objection ("my app user will not login to that website") is why
 * this exists. These 28 tracks stream from Jamendo's public storage host with
 * NO client_id and NO account, so every user gets music without registering
 * anywhere. The rows were verified one by one (see music-stream-catalog.ts);
 * title/artist/genre/duration/licence were read out of each MP3's own ID3 tags,
 * not guessed.
 */
export function jamendoCuratedTrack(row: CuratedJamendoTrack): MusicTrack {
  const deed = row.licenceUrl;
  const shareUrl = `https://www.jamendo.com/track/${row.id}`;
  return {
    id: `jamendo:${row.id}`,
    provider: 'jamendo',
    title: row.title,
    artist: row.artist,
    metadataIncomplete: !row.title || !row.artist,
    source: 'curated',
    durationSec: row.durationSec ?? 0,
    streamUrl: jamendoStreamUrl(row.id),
    licence: row.licence,
    attribution: jamendoAttribution({
      title: row.title,
      artist: row.artist,
      licence: row.licence,
      deed,
      shareUrl,
    }),
    analysable: PROVIDER_SPECS.jamendo.audioCors,
    genre: row.genre,
    mood: moodForGenre(row.genre),
    shareUrl,
  };
}

/** Every curated row as a playable track, in catalog order. */
export const CURATED_JAMENDO_TRACKS: readonly MusicTrack[] =
  JAMENDO_CURATED_TRACKS.map(jamendoCuratedTrack);

/** Curated tracks for one mood bucket (unmapped ID3 genres are excluded). */
export function curatedJamendoForMood(mood: CuratedMood): MusicTrack[] {
  return CURATED_JAMENDO_TRACKS.filter((t) => t.mood === mood);
}

/** Accent-insensitive fold used by the local catalog search. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Local keyword search over the curated catalog. Pure, synchronous, no network.
 * Every query word must appear somewhere on the track; a field match scores
 * higher than a substring hit so "synthwave" outranks an artist that happens to
 * contain the letters.
 */
export function curatedJamendoSearch(query: string, opts?: MusicSearchOpts): MusicTrack[] {
  const q = fold(query);
  if (!q) return [];
  const limit = clampLimit(opts?.limit);
  const words = q.split(/\s+/).filter(Boolean);
  const rows = CURATED_JAMENDO_TRACKS.map((track) => {
    const fields = [track.title, track.artist].filter((v): v is string => typeof v === 'string');
    const genre = track.genre ?? null;
    const mood = track.mood ?? null;
    const hay = fold([...fields, genre, mood].filter(Boolean).join(' '));
    if (!words.every((w) => hay.includes(w))) return { track, score: 0 };
    let score = 0;
    for (const w of words) {
      if (fold(track.title ?? '').includes(w)) score += 3;
      if (fold(track.artist ?? '').includes(w)) score += 2;
      if (fold(genre ?? '').includes(w) || fold(mood ?? '').includes(w)) score += 1;
    }
    return { track, score };
  });
  return rows
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.track);
}

// ---------------------------------------------------------------------------
// Jamendo
// ---------------------------------------------------------------------------

export const JAMENDO_SEARCH_ENDPOINT = 'https://api.jamendo.com/v3.0/tracks/';

export function jamendoSearchUrl(opts: {
  clientId: string;
  query: string;
  limit: number;
}): string {
  const u = new URL(JAMENDO_SEARCH_ENDPOINT);
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('format', 'json');
  u.searchParams.set('limit', String(opts.limit));
  u.searchParams.set('search', opts.query);
  // mp32 = the higher-bitrate preview; mp31 still works if this is rejected.
  u.searchParams.set('audioformat', 'mp32');
  u.searchParams.set('order', 'popularity_total');
  return u.toString();
}

/** `http://creativecommons.org/licenses/by-nc-sa/3.0/` → `CC BY-NC-SA 3.0` */
export function ccLabelFromUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = /licenses\/([a-z-]+)\/(\d+(?:\.\d+)?)/i.exec(raw);
  if (!m) return null;
  const parts = (m[1] ?? '').split('-').filter(Boolean).map((p) => p.toUpperCase());
  if (!parts.length) return null;
  return `CC ${parts.join('-')} ${m[2] ?? ''}`.trim();
}

function isPlayableUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  return /^https?:\/\//i.test(raw.trim());
}

function str(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return '';
}

function seconds(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(str(raw), 10);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

interface JamendoTrackJson {
  id?: unknown;
  name?: unknown;
  artist_name?: unknown;
  duration?: unknown;
  audio?: unknown;
  audiodownload?: unknown;
  shareurl?: unknown;
  license_ccurl?: unknown;
  audiodownload_allowed?: unknown;
  musicinfo?: unknown;
}

interface JamendoEnvelope {
  headers?: { status?: unknown; code?: unknown; error_message?: unknown; warnings?: unknown };
  results?: unknown;
}

/**
 * Parse a Jamendo `/v3.0/tracks/` response.
 *
 * Jamendo answers HTTP 200 even for a rejected key, with
 * `headers.status === 'failed'` and `headers.error_message` set — so the
 * envelope must be inspected, never `response.ok`.
 */
export function parseJamendoResponse(json: unknown): ParseOutcome {
  if (!json || typeof json !== 'object') {
    return { tracks: [], error: { reason: 'parse', detail: 'Jamendo returned a non-object body' } };
  }
  const env = json as JamendoEnvelope;
  const status = str(env.headers?.status).toLowerCase();
  if (status && status !== 'success') {
    const detail =
      str(env.headers?.error_message) ||
      `Jamendo refused the request (status "${status}", code ${str(env.headers?.code) || '?'})`;
    return { tracks: [], error: { reason: 'provider-error', detail } };
  }
  const rows = Array.isArray(env.results) ? (env.results as JamendoTrackJson[]) : [];
  const tracks: MusicTrack[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const streamUrl = str(row.audio);
    if (!isPlayableUrl(streamUrl)) continue;
    const id = str(row.id);
    if (!id) continue;
    // Never invent a title/artist: a missing name stays null and is flagged, so
    // the follow-up can backfill it from the API once a client_id exists.
    const title = str(row.name) || null;
    const artist = str(row.artist_name) || null;
    const deed = str(row.license_ccurl);
    const licence = ccLabelFromUrl(deed) ?? 'Creative Commons (Jamendo)';
    const shareUrl = str(row.shareurl) || undefined;
    const genre = firstTag(row.musicinfo);
    tracks.push({
      id: `jamendo:${id}`,
      provider: 'jamendo',
      title,
      artist,
      metadataIncomplete: !title || !artist,
      source: 'search',
      durationSec: seconds(row.duration),
      streamUrl,
      licence,
      attribution: jamendoAttribution({ title, artist, licence, deed, shareUrl }),
      analysable: PROVIDER_SPECS.jamendo.audioCors,
      genre,
      mood: moodForGenre(genre),
      ...(shareUrl ? { shareUrl } : {}),
    });
  }
  return { tracks };
}

/** First `musicinfo.tags.genres` entry, when the response included musicinfo. */
function firstTag(musicinfo: unknown): string | null {
  if (!musicinfo || typeof musicinfo !== 'object') return null;
  const tags = (musicinfo as { tags?: unknown }).tags;
  if (!tags || typeof tags !== 'object') return null;
  const genres = (tags as { genres?: unknown }).genres;
  if (!Array.isArray(genres)) return null;
  for (const g of genres) {
    const value = str(g);
    if (value) return value;
  }
  return null;
}

function jamendoAttribution(opts: {
  title: string | null;
  artist: string | null;
  licence: string;
  deed: string;
  shareUrl?: string;
}): string {
  const title = opts.title?.trim() || 'Untitled (title not published)';
  const artist = opts.artist?.trim() || 'Unknown artist';
  const bits = [`"${title}" by ${artist}`, `Jamendo`, opts.licence];
  if (opts.deed) bits.push(opts.deed);
  if (opts.shareUrl) bits.push(opts.shareUrl);
  return bits.join(' — ');
}

// ---------------------------------------------------------------------------
// Pixabay
// ---------------------------------------------------------------------------

export const PIXABAY_AUDIO_ENDPOINT = 'https://pixabay.com/api/audio/';

export function pixabaySearchUrl(opts: { apiKey: string; query: string; limit: number }): string {
  const u = new URL(PIXABAY_AUDIO_ENDPOINT);
  u.searchParams.set('key', opts.apiKey);
  u.searchParams.set('q', opts.query);
  u.searchParams.set('per_page', String(Math.max(3, opts.limit)));
  return u.toString();
}

/**
 * Defensive Pixabay audio parser.
 *
 * Pixabay's audio response schema is not documented in the public API docs, so
 * this accepts the field names Pixabay uses for images/videos (plus the `audio`
 * key an audio payload would need) and drops anything it cannot prove is a
 * playable track. It is intentionally tolerant: an unknown shape yields an
 * empty list with a `parse` error rather than fabricated tracks.
 */
export function parsePixabayResponse(json: unknown): ParseOutcome {
  if (!json || typeof json !== 'object') {
    return { tracks: [], error: { reason: 'parse', detail: 'Pixabay returned a non-object body' } };
  }
  const body = json as { hits?: unknown; totalHits?: unknown };
  if (!Array.isArray(body.hits)) {
    return {
      tracks: [],
      error: { reason: 'parse', detail: 'Pixabay response had no `hits` array' },
    };
  }
  const tracks: MusicTrack[] = [];
  for (const raw of body.hits as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const hit = raw as Record<string, unknown>;
    const id = str(hit.id);
    if (!id) continue;
    const streamUrl = str(hit.audio) || str(hit.audioURL) || str(hit.previewURL);
    if (!isPlayableUrl(streamUrl)) continue;
    const title = str(hit.title) || str(hit.tags) || null;
    const artist = str(hit.user) || null;
    const shareUrl = str(hit.pageURL) || undefined;
    tracks.push({
      id: `pixabay:${id}`,
      provider: 'pixabay',
      title,
      artist,
      metadataIncomplete: !title || !artist,
      source: 'search',
      durationSec: seconds(hit.duration),
      streamUrl,
      licence: PROVIDER_SPECS.pixabay.licence,
      attribution: `"${title ?? 'Untitled (title not published)'}" by ${artist ?? 'Unknown artist'} — Pixabay Content License${shareUrl ? ` — ${shareUrl}` : ''}`,
      analysable: PROVIDER_SPECS.pixabay.audioCors,
      ...(shareUrl ? { shareUrl } : {}),
    });
  }
  return { tracks };
}

// ---------------------------------------------------------------------------
// Incompetech (no API — curated, verified static URLs)
// ---------------------------------------------------------------------------

export interface CuratedIncompetechTrack {
  slug: string;
  title: string;
  /** Lowercase mood/use tags for keyword matching. */
  tags: readonly string[];
}

/**
 * Verified 2026-11-24: every URL below answered `206` to a range request.
 * `durationSec` is reported as 0 — Incompetech does not publish durations and
 * we refuse to guess them.
 */
export const INCOMPETECH_TRACKS: readonly CuratedIncompetechTrack[] = [
  { slug: 'Monkeys Spinning Monkeys', title: 'Monkeys Spinning Monkeys', tags: ['quirky', 'playful', 'comedy', 'upbeat'] },
  { slug: 'Fluffing a Duck', title: 'Fluffing a Duck', tags: ['playful', 'comedy', 'light', 'quirky'] },
  { slug: 'Sneaky Snitch', title: 'Sneaky Snitch', tags: ['sneaky', 'comedy', 'mystery', 'pizzicato'] },
  { slug: 'Carefree', title: 'Carefree', tags: ['happy', 'bright', 'upbeat', 'acoustic'] },
  { slug: 'Life of Riley', title: 'Life of Riley', tags: ['happy', 'folk', 'warm', 'acoustic'] },
  { slug: 'Wallpaper', title: 'Wallpaper', tags: ['chill', 'calm', 'lofi', 'background'] },
  { slug: 'Local Forecast - Elevator', title: 'Local Forecast - Elevator', tags: ['chill', 'jazz', 'elevator', 'lounge'] },
  { slug: 'Airport Lounge', title: 'Airport Lounge', tags: ['jazz', 'lounge', 'chill', 'cool'] },
  { slug: 'Kick Shock', title: 'Kick Shock', tags: ['electronic', 'energetic', 'action'] },
  { slug: 'Pixel Peeker Polka - faster', title: 'Pixel Peeker Polka (faster)', tags: ['polka', 'fast', 'comedy', 'party'] },
  { slug: 'Smooth Lovin', title: 'Smooth Lovin', tags: ['soul', 'smooth', 'romantic', 'chill'] },
];

const INCOMPETECH_BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const INCOMPETECH_DEED = 'https://creativecommons.org/licenses/by/4.0/';

export function incompetechStreamUrl(slug: string): string {
  return `${INCOMPETECH_BASE}${encodeURIComponent(slug)}.mp3`;
}

/** Exact CC BY 4.0 attribution block Incompetech's own licence generator emits, on one line. */
export function incompetechAttribution(title: string): string {
  return `"${title}" — Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 — ${INCOMPETECH_DEED}`;
}

/** Local keyword search over the curated list. No network. */
export function incompetechSearch(query: string, opts?: MusicSearchOpts): MusicTrack[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = clampLimit(opts?.limit);
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  const scored = INCOMPETECH_TRACKS.map((t) => {
    const hay = `${t.title} ${t.tags.join(' ')}`.toLowerCase();
    let score = 0;
    if (t.title.toLowerCase().includes(q)) score += 3;
    for (const w of words) if (hay.includes(w)) score += 1;
    return { t, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ t }) => ({
    id: `incompetech:${t.slug}`,
    provider: 'incompetech' as const,
    title: t.title,
    artist: 'Kevin MacLeod',
    metadataIncomplete: false,
    source: 'curated' as const,
    durationSec: 0,
    streamUrl: incompetechStreamUrl(t.slug),
    licence: PROVIDER_SPECS.incompetech.licence,
    attribution: incompetechAttribution(t.title),
    analysable: PROVIDER_SPECS.incompetech.audioCors,
  }));
}

export function clampLimit(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return PROVIDER_DEFAULT_LIMIT;
  return Math.min(PROVIDER_MAX_LIMIT, Math.max(1, Math.floor(raw)));
}
