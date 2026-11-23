// Per-character colour on the free HTTP MP3 tier — RETIRED (owner, 2026-11-23).
//
// The owner's verdict: "all the modified sound not sound good ... please only
// use the original TTS." So the MP3 tier now plays Google's audio exactly as
// the endpoint returns it, at playbackRate 1 with the browser's normal pitch
// preservation. There is NO character pitch bias, NO gender pitch band and NO
// per-id jitter any more.
//
// Why the old mechanism is gone and must not be restored:
//   - Google Translate TTS serves ONE speaker per `tl`, and that speaker is
//     female for every code this app ships. The old code passed
//     preservesPitch=false + playbackRate=0.64…1.72 to make one female MP3
//     impersonate male/bright/deep characters. Resampling shifts formants and
//     tempo together, so the owner heard slurred, chipmunk and "not good"
//     speech (complaint 1) and a pitched-down woman whenever a male card was
//     tapped (complaint 2).
//   - A truthful male voice needs a real male SOURCE (Edge neural / OS
//     speechSynthesis / a hosted model). Faking it from the female MP3 is the
//     bug, not the fix.
//
// Why NOT Web Audio here: translate.google.com returns
// Cross-Origin-Resource-Policy with NO Access-Control-Allow-Origin, so an
// <audio> element can play the response but createMediaElementSource /
// decodeAudioData taints or silences it on Chrome and iOS Safari. That is
// still true and is why no formant filter is used instead.
//
// `gttsCharacterPitchBias` is kept as a documented identity mapping because
// lib/voice.ts owns a single shared resolver (`gttsPitchBias`) that every
// speak path calls. Returning 1 makes the MP3 tier original audio; it also
// makes the `pitchBias !== 1` branch in lib/gtts.ts unreachable, so no caller
// can reintroduce a reshape without deleting this file's contract on purpose.

import type { Lang } from './prefs';

/**
 * Kept for the pinned-button / Edge-prosody types that still speak of pitch
 * tiers. Once pitch reshaping was removed there is only the natural tier, and
 * the catalog ships only `mid`; the union stays so old ids keep a type.
 */
export type GttsPitchTier = 'bright' | 'mid' | 'deep';

/**
 * The only value this module can return. Exported so tests can pin the
 * contract instead of a magic number, and so the intent reads at the call
 * site: original audio, no pitch processing.
 */
export const ORIGINAL_TTS_PITCH_BIAS = 1;

/**
 * Identity mapping — always 1. Arguments are accepted (and ignored) so the
 * shared resolver in lib/voice.ts keeps one signature for every tier.
 *
 * Do NOT reintroduce gender/tier maths here without a real, separate voice
 * source: the owner has ruled pitch-shifted impersonation out.
 */
export function gttsCharacterPitchBias(
  _gender?: 'female' | 'male',
  _characterId?: string,
  _lang?: Lang,
  _tierOverride?: GttsPitchTier | null,
): number {
  return ORIGINAL_TTS_PITCH_BIAS;
}
