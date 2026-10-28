// Lines spoken while the brain is still working. Short stubs only —
// "um……", "ha……", and on a longer wait "um…… let me think."

import { planTools } from './live-tools';
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
  // First beat is a short um/ha. A longer wait says "let me think", or
  // "let me search the web" when this turn actually looks something up.
  const thinkAt = Math.max(0, bank.length - 2);
  const short = bank.slice(0, thinkAt);
  const think = bank[thinkAt] ?? bank[0]!;
  const search = bank[bank.length - 1] ?? think;
  if (n <= 0) {
    const pool = short.length ? short : bank;
    const idx = (seed + (MOOD_OFFSET[mood ?? ''] ?? 0)) % pool.length;
    return pool[idx]!;
  }
  const web = Boolean(userText && needsWeb(userText));
  return web ? search : think;
}

function needsWeb(text: string): boolean {
  const plan = planTools(text);
  return plan.weather || plan.news || plan.where || Boolean(plan.searchQuery);
}
