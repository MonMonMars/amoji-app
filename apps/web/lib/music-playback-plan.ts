// Pure playback-routing gate for streamed music.
//
// WHY THIS IS ITS OWN MODULE
// `music-stream.ts` is the search client: it reads provider API keys and owns a
// `fetch`. The playback path must never import it, or the static Pages export
// would carry a network client into the music bed chunk even though nothing
// calls it. This file is deliberately inert — types and two pure functions, no
// env, no fetch, no timers, no DOM — so bundling it cannot add a request.
//
// `music-stream.ts` re-exports these symbols, so the original import site and
// its tests keep working.

import type { MusicTrack } from './music-stream-providers';

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
