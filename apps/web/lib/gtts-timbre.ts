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
// (already iOS-safe in gtts.ts). Gender sets the base; curated bright / mid /
// deep tiers spread companions of the SAME gender so two females (or two
// males) stay audibly different. A tiny hash micro-jitter separates ids that
// land on the same tier. Bounds stay inside the gtts clamp so the line does
// not turn into chipmunk / slurry audio.

import type { Lang } from './prefs';
import { CHARACTERS_WANT } from './characters-want';
import {
  GTTS_PITCH_BIAS_MAX,
  GTTS_PITCH_BIAS_MIN,
  PITCH_BIAS_FEMALE,
  PITCH_BIAS_MALE,
} from './gtts';

/** Audible high / mid / low colour within a gender band. */
export type GttsPitchTier = 'bright' | 'mid' | 'deep';

/**
 * Half-width of the residual per-id micro-jitter around a curated tier.
 * Kept small — tiers carry the real separation.
 */
export const CHAR_PITCH_SPREAD = 0.015;

/**
 * How far bright / deep sit from the gender mid.
 * After #437 male bright (1.26) crossed above 1.0 and above female deep (0.75),
 * so "bright male" sounded pitched-female on gTTS. Keep the whole male band
 * strictly below 1.0 and the whole female band strictly above 1.0, while still
 * spreading deep≪mid≪bright as wide as the clamp allows. Prefer distinct Edge
 * neural ids when that hop runs; these offsets are the gTTS fallback.
 */
export const FEMALE_TIER_OFFSET: Record<GttsPitchTier, number> = {
  // 1.30−0.18 → 1.12; 1.30+0.42 → 1.72 — all > 1.0; bright−deep ≥ 0.60
  deep: -0.18,
  mid: 0,
  bright: 0.42,
};

export const MALE_TIER_OFFSET: Record<GttsPitchTier, number> = {
  // 0.64−0.26 → 0.38 (floor); 0.64+0.26 → 0.90 — all < 1.0; bright−deep ≥ 0.50
  deep: -0.26,
  mid: 0,
  bright: 0.26,
};

/** Google ja-JP reads bright; male delivery needs extra depth (still inside gtts clamp). */
export const GTTS_MALE_BIAS_JA = 0.42;

const TIER_CYCLE: readonly GttsPitchTier[] = ['deep', 'mid', 'bright'];

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

/** Build stable deep→mid→bright assignment within each gender (sorted ids). */
function buildCuratedTierMap(): Map<string, GttsPitchTier> {
  const map = new Map<string, GttsPitchTier>();
  for (const gender of ['female', 'male'] as const) {
    const ids = CHARACTERS_WANT
      .filter((c) => c.gender === gender)
      .map((c) => c.id)
      .sort();
    ids.forEach((id, i) => {
      map.set(id, TIER_CYCLE[i % TIER_CYCLE.length]!);
    });
  }
  return map;
}

const CURATED_TIERS = buildCuratedTierMap();

/** Hash fallback when the id is not on the want roster. */
function hashTier(characterId: string): GttsPitchTier {
  const u = characterPitchUnit(characterId);
  if (u < -1 / 3) return 'deep';
  if (u < 1 / 3) return 'mid';
  return 'bright';
}

/** Curated (or hashed) pitch colour for a companion. */
export function gttsPitchTierFor(characterId: string): GttsPitchTier {
  return CURATED_TIERS.get(characterId) ?? hashTier(characterId);
}

/**
 * Pitch multiplier for the free MP3 tier. Same gender → nearby but different
 * numbers; every male tier stays below 1.0 and every female tier stays above
 * 1.0 (male bright must never cross into female deep).
 *
 * `tierOverride` comes from a pinned voice button (selectable deep/mid/bright).
 * When omitted, companions keep the curated per-character tier from #374.
 */
export function gttsCharacterPitchBias(
  gender: 'female' | 'male',
  characterId?: string,
  lang?: Lang,
  tierOverride?: GttsPitchTier | null,
): number {
  let base = gender === 'male' ? PITCH_BIAS_MALE : PITCH_BIAS_FEMALE;
  if (gender === 'male' && lang === 'ja') base = GTTS_MALE_BIAS_JA;
  if (!characterId && !tierOverride) return base;
  const tier = tierOverride ?? (characterId ? gttsPitchTierFor(characterId) : 'mid');
  const offset = (gender === 'male' ? MALE_TIER_OFFSET : FEMALE_TIER_OFFSET)[tier];
  const jitter = characterId ? characterPitchUnit(characterId) * CHAR_PITCH_SPREAD : 0;
  // Keep inside the same clamp gtts.ts applies to pitchBias.
  return clamp(base + offset + jitter, GTTS_PITCH_BIAS_MIN, GTTS_PITCH_BIAS_MAX);
}

/** True when two character ids resolve to different biases (any measurable delta). */
export function pitchesDiffer(
  a: { gender: 'female' | 'male'; id: string },
  b: { gender: 'female' | 'male'; id: string },
): boolean {
  return gttsCharacterPitchBias(a.gender, a.id) !== gttsCharacterPitchBias(b.gender, b.id);
}
