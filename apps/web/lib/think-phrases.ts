// Loading stubs while a reply is still generating. Same short sounds as the
// warm-up bank. A felt mood only changes which stub plays. Lines queue and
// finish; they do not cut the previous utterance.

import type { Lang } from './prefs';
import { LOADING_MOOD_STUBS, LOADING_STUBS } from './thinking-lines';

type PhraseBank = Record<Lang, readonly string[]>;

export const MOOD_THINK: Record<string, PhraseBank> = LOADING_MOOD_STUBS;

/**
 * The n-th loading stub (0-based). Wraps if the wait outlasts the bank.
 * An explicit felt mood picks that mood's stubs; unknown moods use the
 * plain um / ha / think / search list.
 */
export function pickThinkPhrase(_characterId: string, lang: Lang, phase: number, mood?: string): string {
  if (mood && mood !== 'unknown') {
    const moodList = MOOD_THINK[mood]?.[lang] ?? MOOD_THINK[mood]?.yue;
    if (moodList && moodList.length) return moodList[phase % moodList.length]!;
  }
  const list = LOADING_STUBS[lang] ?? LOADING_STUBS.yue;
  return list[phase % list.length]!;
}
