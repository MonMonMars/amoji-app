// Per-character colour on the free HTTP MP3 tier.
//
// Google Translate TTS serves ONE speaker per `tl`. Edge neural casting is
// dead (WSS upgrade 403 with the published token). speechSynthesis is muted
// by the iPhone silent switch. So the only free, keyless, CORS-playable path
// that still speaks Cantonese is gTTS — and every companion would sound
// identical without a client-side reshape.
//
// Why NOT Web Audio formant filtering on the MP3:
//   translate.google.com returns Cross-Origin-Resource-Policy and NO
//   Access-Control-Allow-Origin. An <audio> element can PLAY that response
//   (no CORS needed to hear it), but createMediaElementSource / decodeAudioData
//   taints or silences the graph on Chrome and iOS Safari. Shipping a formant
//   chain would make the free tier go quiet — the exact failure we are fixing.
//
// What we DO ship: HTMLAudioElement.playbackRate with preservesPitch=false
// (already iOS-safe in gtts.ts). Gender sets the base; a stable hash of the
// character id spreads companions of the SAME gender so two females (or two
// males) are still audibly different. Bounds stay inside the gtts clamp so
// the line does not turn into chipmunk / slurry audio.

import { PITCH_BIAS_FEMALE, PITCH_BIAS_MALE } from './gtts';

/** Half-width of the per-character spread around the gender base. */
export const CHAR_PITCH_SPREAD = 0.045;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Stable −1…+1 fingerprint from a character id (FNV-1a + murmur finalizer). */
export function characterPitchUnit(characterId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < characterId.length; i++) {
    h ^= characterId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Short ids like a01/a02/a03 only flip one byte; avalanche so neighbours
  // do not collapse into the same audible pitch band.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  // Unsigned fraction in [0, 1], then centred on 0.
  const u = (h >>> 0) / 0xffffffff;
  return u * 2 - 1;
}

/**
 * Pitch multiplier for the free MP3 tier. Same gender → nearby but different
 * numbers; different genders stay on opposite sides of 1.0.
 */
export function gttsCharacterPitchBias(
  gender: 'female' | 'male',
  characterId?: string,
): number {
  const base = gender === 'male' ? PITCH_BIAS_MALE : PITCH_BIAS_FEMALE;
  if (!characterId) return base;
  const jitter = characterPitchUnit(characterId) * CHAR_PITCH_SPREAD;
  // Keep inside the same clamp gtts.ts applies to pitchBias.
  return clamp(base + jitter, 0.82, 1.2);
}

/** True when two character ids resolve to different biases (any measurable delta). */
export function pitchesDiffer(
  a: { gender: 'female' | 'male'; id: string },
  b: { gender: 'female' | 'male'; id: string },
): boolean {
  return gttsCharacterPitchBias(a.gender, a.id) !== gttsCharacterPitchBias(b.gender, b.id);
}
