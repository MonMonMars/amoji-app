// Bridge: keyless curated Jamendo catalog → the existing performance player.
//
// WHY A BRIDGE
// `music-stream.ts` is the search client and must not know about UI clip types.
// This module does one thing: turn a verified `MusicTrack` into the same
// `PerformanceClip` shape bundled CC0 beds already use, so `startLibraryPerformance`
// → `playClipElement` plays a streamed track exactly like a local one. One
// player, one mute switch (`amoji.bgm-mute.v1`), one BGM volume step.
//
// STATIC-EXPORT SAFETY
// No env read, no fetch, no timer, no `window`. The catalog is pure data, so a
// GitHub Pages export still ships with zero keys and zero API-lane requests.
// Key-gated text search stays in `music-stream.ts` and is never called here.

import type { PerformanceClip, PerformanceLang } from './performance-clips';
import { musicAttributionLine, musicPlaybackPlan } from './music-playback-plan';
import {
  CURATED_JAMENDO_TRACKS,
  curatedJamendoForMood,
  type CuratedMood,
  type MusicTrack,
} from './music-stream-providers';

const ALL_LANGS: PerformanceLang[] = ['en', 'yue', 'zh', 'ja'];

/** Query style → the catalog's coarse mood bucket. `null` = no opinion. */
const STYLE_MOOD: Record<string, CuratedMood | null> = {
  jazz: 'calm',
  chill: 'calm',
  lofi: 'calm',
  ballad: 'calm',
  pop: 'upbeat',
  uspop: 'upbeat',
  jpop: 'upbeat',
  cantopop: 'upbeat',
  hiphop: 'upbeat',
  electronic: 'upbeat',
  rock: 'upbeat',
  dance: 'upbeat',
  cute: 'upbeat',
  world: 'upbeat',
  default: null,
};

/** Felt moods that must never pick a club track for a quiet moment. */
const CALM_MOODS = new Set(['sad', 'tired', 'anxious']);

function moodBucketFor(style: string | undefined, mood?: string): CuratedMood | null {
  const key = (style ?? '').trim().toLowerCase();
  let bucket: CuratedMood | null = Object.prototype.hasOwnProperty.call(STYLE_MOOD, key)
    ? STYLE_MOOD[key] ?? null
    : null;
  if (CALM_MOODS.has((mood ?? '').trim().toLowerCase())) bucket = 'calm';
  return bucket;
}

/** Exact curated row for a select-chip id (`jamendo:<rawId>`). */
export function curatedMusicTrackById(id: string | null | undefined): MusicTrack | null {
  if (!id) return null;
  const needle = id.trim();
  return CURATED_JAMENDO_TRACKS.find((t) => t.id === needle) ?? null;
}

/**
 * Deterministic pick for a style/mood ask. `n` rotates the bucket so repeated
 * asks do not replay one track, and announce-then-play resolve to the same row
 * (same contract as `pickStreamTrack`). The caller only reaches this when the
 * owner-pinned Mixkit pool had no style match.
 */
export function curatedTrackForStyle(
  style: string | undefined,
  n = 0,
  mood?: string,
): MusicTrack | null {
  const bucket = moodBucketFor(style, mood);
  const pool: readonly MusicTrack[] = bucket
    ? curatedJamendoForMood(bucket)
    : CURATED_JAMENDO_TRACKS;
  if (!pool.length) return null;
  return pool[Math.abs(n) % pool.length] ?? null;
}

/** Up to `limit` curated rows for the "what songs do you have" chips. */
export function curatedTracksForStyle(
  style: string | undefined,
  limit: number,
  mood?: string,
): MusicTrack[] {
  const bucket = moodBucketFor(style, mood);
  const pool: readonly MusicTrack[] = bucket
    ? curatedJamendoForMood(bucket)
    : CURATED_JAMENDO_TRACKS;
  return pool.slice(0, Math.max(0, limit));
}

/**
 * One curated track as a performance bed the existing player understands.
 * `analysable` comes from `musicPlaybackPlan()` — never re-derived here — so a
 * provider whose CDN stops sending CORS headers fails safe (untapped, audible)
 * instead of going silent.
 */
export function curatedMusicBed(track: MusicTrack): PerformanceClip {
  const title = track.title?.trim() || track.artist?.trim() || 'Jamendo track';
  const labels: Record<PerformanceLang, string> = {
    en: title,
    yue: title,
    zh: title,
    ja: title,
  };
  const plan = musicPlaybackPlan(track);
  return {
    id: `stream:${track.id}`,
    kind: 'dance',
    // BPM hint only: an analysed stream locks real onsets; this is the
    // known-tempo fallback for a stale CORS edge cache.
    style: track.mood === 'calm' ? 'chill' : 'dance',
    file: plan.url,
    durationMs: Math.max(0, Math.round((track.durationSec || 0) * 1000)),
    volume: 'bgmVol',
    moods: ['happy', 'neutral'],
    langs: ALL_LANGS,
    characters: [],
    labels,
    license: 'Jamendo-CC',
    credit: musicAttributionLine(track),
    source: track.shareUrl ?? 'https://www.jamendo.com/',
    artist: track.artist ?? undefined,
    analysable: plan.routeThroughAnalyser,
    attribution: musicAttributionLine(track),
  };
}
