// Lines spoken while the brain is still working, and the timing that governs
// them. Only the wait beats live here — "um……", "ha……", and the full
// "um…… let me think / let me search" sentences.

import { planTools } from './live-tools';
import { LOADING_MOOD_STUBS, LOADING_STUBS } from './thinking-lines';

/**
 * How long a reply must be loading before she makes any sound. Under this the
 * turn feels instant, and a filler would talk over a reply that is already
 * arriving (Mon: the loading sound "still appear too soon").
 */
export const WARMUP_FIRST_MS = 1_000;
/** Gap between wait beats — the first one is allowed to finish speaking. */
export const WARMUP_GAP_MS = 4_500;
/** Never ramble: two beats, then she simply smiles and waits. */
export const WARMUP_MAX_LINES = 2;

export const WARMUP_BANKS: Record<string, readonly string[]> = {
  yue: LOADING_STUBS.yue,
  zh: LOADING_STUBS.zh,
  ja: LOADING_STUBS.ja,
  en: LOADING_STUBS.en,
};

/**
 * A beat shorter than this is a bare sound ("um…"). Mon: the loading voice was
 * "too short", so a beat that only plays after the wait threshold speaks a
 * whole sentence — she has been thinking long enough to say so.
 */
export const SUBSTANTIAL_STUB_CHARS = 6;

/** True when a stub is a sentence rather than a one-syllable sound. */
export function isSubstantialStub(line: string): boolean {
  return line.trim().length >= SUBSTANTIAL_STUB_CHARS;
}

/** The longest stub in the bank — a full sentence in every shipped language. */
export function longestWarmupLine(lang: string): string {
  const bank = WARMUP_BANKS[lang] ?? WARMUP_BANKS.yue!;
  return bank.reduce((longest, line) => (line.length > longest.length ? line : longest), bank[0]!);
}

/**
 * Pick the n-th wait beat. Always a whole sentence: the spoken wait only fires
 * after WARMUP_FIRST_MS, by which point a bare "um…" reads as a clipped sigh
 * rather than a pause for thought. This is the "keep the um voice longer"
 * half of Mon's note — the cue never says a bare sound.
 *
 * `avoid` is the line just spoken, so consecutive beats never repeat:
 *   beat 1 — what this turn is doing ("let me search" for a lookup, else
 *            "let me think")
 *   beat 2 — the other sentence, proving she is still working
 * A felt mood only swaps which stub the FIRST beat prefers when its bank has a
 * full sentence of its own; the sentence must still be a whole line.
 * Deterministic for the same inputs, so a test can pin the exact plan.
 */
export function pickWaitLine(
  characterId: string,
  lang: string,
  n: number,
  userText?: string,
  avoid?: string,
  mood?: string,
): string {
  const bank = WARMUP_BANKS[lang] ?? WARMUP_BANKS.yue!;
  // A felt mood's own bank first (its last slot is always the sentence), then
  // the plain bank. Every candidate is filtered to whole sentences, so the cue
  // can never degrade back to a bare "um…".
  const moodBank = mood && mood !== 'unknown'
    ? (LOADING_MOOD_STUBS as Record<string, Record<string, readonly string[]>>)[mood]?.[lang]
    : undefined;
  const long = [...(moodBank ?? []), ...bank].filter(isSubstantialStub);
  const unique = [...new Set(long)];
  if (unique.length === 0) return longestWarmupLine(lang);
  // A lookup announces the search first; plain chat announces thinking.
  const ordered = Boolean(userText && needsWeb(userText)) ? [...unique].reverse() : unique;
  for (let i = 0; i < ordered.length; i += 1) {
    const line = ordered[(n + i) % ordered.length]!;
    if (line !== avoid) return line;
  }
  return ordered[n % ordered.length]!;
}

function needsWeb(text: string): boolean {
  const plan = planTools(text);
  return plan.weather || plan.news || plan.where || Boolean(plan.searchQuery);
}
