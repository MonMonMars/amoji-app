// Lines spoken while the brain is still working. Short stubs only —
// "um……", "ha……", and on a longer wait "um…… let me think."

import { LOADING_STUBS } from './thinking-lines';

/** delay before the first warm-up line lands (right after the "hmm…") */
export const WARMUP_FIRST_MS = 1_300;
/** gap between warm-up lines — conversational, unhurried */
export const WARMUP_GAP_MS = 3_800;
/** never ramble: after this many lines she simply smiles and waits */
export const WARMUP_MAX_LINES = 3;

export const WARMUP_BANKS: Record<string, readonly string[]> = {
  yue: LOADING_STUBS.yue,
  zh: LOADING_STUBS.zh,
  ja: LOADING_STUBS.ja,
  en: LOADING_STUBS.en,
};

/** felt-mood nudge: a sad/tired user gets the gentler, softer slots first */
const MOOD_OFFSET: Record<string, number> = {
  sad: 3,
  tired: 3,
  angry: 5,
  happy: 0,
  joy: 0,
  surprise: 1,
  surprised: 1,
  neutral: 0,
};

/**
 * Pick the n-th warm-up stub for this character/language. Deterministic:
 * the same inputs always give the same line (the caller advances `n`).
 */
export function pickWarmupLine(
  characterId: string,
  lang: string,
  n: number,
  userText?: string,
  mood?: string,
): string {
  const bank = WARMUP_BANKS[lang] ?? WARMUP_BANKS.yue!;
  const seed = [...characterId].reduce((a, c) => a + c.charCodeAt(0), 0) + (userText?.length ?? 0);
  const idx = (seed + n * 3 + (MOOD_OFFSET[mood ?? ''] ?? 0)) % bank.length;
  return bank[idx]!;
}
