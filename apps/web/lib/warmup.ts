// Lines spoken while the brain is still working. Cantonese uses Pixel's
// natural thinking set. Other languages are the same pause-to-think tone.

import { YUE_THINKING_LINES } from './thinking-lines';

/** delay before the first warm-up line lands (right after the "hmm…") */
export const WARMUP_FIRST_MS = 1_300;
/** gap between warm-up lines — conversational, unhurried */
export const WARMUP_GAP_MS = 3_800;
/** never ramble: after this many lines she simply smiles and waits */
export const WARMUP_MAX_LINES = 3;

export const WARMUP_BANKS: Record<string, string[]> = {
  yue: [...YUE_THINKING_LINES],
  zh: [
    '嗯，让我想想先',
    '嗯嗯嗯',
    '等一下，我想清楚一点',
    '我在想啦',
    '好问题，让我想想',
    '稍等，我整理一下',
  ],
  ja: [
    'うん、ちょっと考えさせて',
    'うーん',
    '待って、ちゃんと考えてから',
    '考えてるよ',
    'いい質問だね、少し待って',
    'えっと、整理してる',
  ],
  en: [
    'Hmm, let me think first',
    'Mm-hmm',
    'One second, I want to get this right',
    'I am thinking',
    'Good question, give me a moment',
    'Hang on, sorting it out',
  ],
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
 * Pick the n-th warm-up line for this character/language. Deterministic:
 * the same inputs always give the same line (the caller advances `n`), and
 * the rotation spreads across the bank — seeded by the character id and the
 * length of what the user just said, nudged by the felt mood.
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
