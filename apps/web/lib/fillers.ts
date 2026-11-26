// Verbal tics that make the companion feel alive — the ChatGPT-voice layer.
// Two tables:
//  · THINKING_FILLERS — tiny loading stubs ("um……", "ha……") while a reply generates
//  · INTERJECTIONS    — audible reactions (giggles, gasps, sighs) prepended to
//    a spoken reply when the dominant emotion is STRONG (≥ INTERJECTION_AT)
// A felt mood only swaps which stub plays. Longer waits may say
// "um…… let me think." or "um…… let me search the web." Nothing longer.
// Pure data + tiny pickers so it stays unit-testable in node.

import { LOADING_MOOD_STUBS, LOADING_STUBS } from './thinking-lines';

export type LangCode = 'yue' | 'zh' | 'ja' | 'en';

/** below this intensity the emotion is felt in prosody only, not a vocal tic */
/** Owner: mild joy (0.6–0.7) must not prepend 呀/好 on every turn. */
export const INTERJECTION_AT = 0.72;

export const THINKING_FILLERS: Record<LangCode, string[]> = {
  yue: [...LOADING_STUBS.yue],
  zh: [...LOADING_STUBS.zh],
  ja: [...LOADING_STUBS.ja],
  en: [...LOADING_STUBS.en],
};

/** Mood-tinted loading stub. Same sounds as THINKING_FILLERS, different order. */
export const MOOD_FILLERS: Record<string, Record<LangCode, readonly string[]>> = LOADING_MOOD_STUBS;

/**
 * Audible emotion reactions, per language. pitch/rate are SSML-style deltas
 * applied to the tic itself (giggles pop up, sighs sink down).
 */
export const INTERJECTIONS: Record<string, Partial<Record<LangCode, { text: string; pitch: number; rate: number }>>> = {
  // t771: joy tic is soft — never TTS hehe/haha (laugh = SFX only).
  // Never 嗯/um/うん — those map to the loading um clip (Pixel: no thinking filler).
  joy: {
    // Owner 2026-11-26: a reply must not open on a lone 呀. It is a
    // sentence-final particle (係呀), not an interjection, so spoken alone it
    // reads as a stray syllable. Use a real two-syllable cheer instead.
    yue: { text: '好嘢！', pitch: 0.08, rate: 0.06 },
    zh: { text: '太好了！', pitch: 0.08, rate: 0.06 },
    ja: { text: 'やった！', pitch: 0.08, rate: 0.06 },
    en: { text: 'ah!', pitch: 0.08, rate: 0.06 },
  },
  excitement: {
    yue: { text: '哇！', pitch: 0.2, rate: 0.16 },
    zh: { text: '哇！', pitch: 0.2, rate: 0.16 },
    ja: { text: 'わあ！', pitch: 0.18, rate: 0.16 },
    en: { text: 'ooh!', pitch: 0.18, rate: 0.16 },
  },
  surprise: {
    yue: { text: '咦？！', pitch: 0.2, rate: 0.1 },
    zh: { text: '哎呀！', pitch: 0.18, rate: 0.1 },
    ja: { text: 'えっ！', pitch: 0.18, rate: 0.1 },
    en: { text: 'oh!', pitch: 0.18, rate: 0.1 },
  },
  sadness: {
    yue: { text: '唉……', pitch: -0.08, rate: -0.12 },
    zh: { text: '唉……', pitch: -0.08, rate: -0.12 },
    ja: { text: 'ううっ……', pitch: -0.06, rate: -0.12 },
    en: { text: 'aww……', pitch: -0.08, rate: -0.1 },
  },
  anger: {
    yue: { text: '哼！', pitch: -0.04, rate: 0.12 },
    zh: { text: '哼！', pitch: -0.04, rate: 0.12 },
    ja: { text: 'ちっ！', pitch: -0.04, rate: 0.12 },
    en: { text: 'hmph!', pitch: -0.04, rate: 0.1 },
  },
  embarrassment: {
    yue: { text: '哎呀……', pitch: 0.12, rate: -0.02 },
    zh: { text: '哎呀……', pitch: 0.12, rate: -0.02 },
    ja: { text: 'やだ……', pitch: 0.1, rate: -0.02 },
    en: { text: 'oh gosh……', pitch: 0.1, rate: -0.04 },
  },
  confusion: {
    yue: { text: '咦？', pitch: 0.12, rate: -0.06 },
    zh: { text: '诶？', pitch: 0.12, rate: -0.06 },
    // Not えっと — that maps to the loading um clip (Pixel).
    ja: { text: 'あれ？', pitch: 0.1, rate: -0.08 },
    en: { text: 'huh?', pitch: 0.12, rate: -0.06 },
  },
  // Soft moods: breathy/warm tics — never typed laughs (SFX owns giggles),
  // and never 嗯/um/うん loading-filler leads (Pixel).
  love: {
    // Never a bare 呀 here either (owner 2026-11-26) — 哎呀 is a real sigh.
    yue: { text: '哎呀……', pitch: 0.05, rate: -0.08 },
    zh: { text: '哎呀……', pitch: 0.05, rate: -0.08 },
    ja: { text: 'ふぅ……', pitch: 0.04, rate: -0.08 },
    en: { text: 'aw…', pitch: 0.04, rate: -0.08 },
  },
  contentment: {
    yue: { text: '好。', pitch: 0.02, rate: -0.1 },
    zh: { text: '好。', pitch: 0.02, rate: -0.1 },
    ja: { text: 'はい。', pitch: 0.02, rate: -0.1 },
    en: { text: 'okay.', pitch: 0.02, rate: -0.1 },
  },
  relief: {
    yue: { text: '呼……', pitch: -0.02, rate: -0.1 },
    zh: { text: '呼……', pitch: -0.02, rate: -0.1 },
    ja: { text: 'ふう……', pitch: -0.02, rate: -0.1 },
    en: { text: 'phew…', pitch: -0.02, rate: -0.1 },
  },
  pride: {
    yue: { text: '得！', pitch: 0.08, rate: 0.02 },
    zh: { text: '好！', pitch: 0.08, rate: 0.02 },
    ja: { text: 'ふん！', pitch: 0.08, rate: 0.02 },
    en: { text: 'yes!', pitch: 0.08, rate: 0.02 },
  },

};

/**
 * Soft-mode search delay lines.
 *
 * Owner request (2026-11-24): "delay the search if too many search at a time.
 * Let the character say something long to delay the search." These are
 * deliberately longer than a loading stub — the server's `soft` breaker makes
 * the client hold for `delayMs` (2 500 ms), and this line covers that wait in
 * her voice. Same-language, no questions, one short paragraph.
 */
export const SEARCH_DELAY_LINES: Record<LangCode, readonly string[]> = {
  yue: [
    '等我慢慢搵下先……而家搵歌嘅人多咗少少，我幫你揀首好聽嘅，慢慢等一陣就得。',
  ],
  zh: [
    '我先慢慢找一下……现在找歌的人有点多，我帮你挑一首好听的，稍等一下就好。',
  ],
  ja: [
    'ちょっとゆっくり探してみるね……今は曲を探している人が少し多いから、いい曲を選ぶまで少しだけ待っててね。',
  ],
  en: [
    'Let me take a slow look… lots of people are asking for songs right now, so I will pick a good one and it will only take a moment.',
  ],
};

let fillerIdx = 0;
let moodFillerIdx = 0;
let searchDelayIdx = 0;
/** Round-robin so consecutive sends don't repeat the same "hmm…". */
export function pickThinkingFiller(lang: string, mood?: string): string {
  const moodList = mood ? MOOD_FILLERS[mood]?.[(lang as LangCode)] ?? MOOD_FILLERS[mood]?.en : undefined;
  if (moodList && moodList.length) {
    moodFillerIdx = (moodFillerIdx + 1) % moodList.length;
    return moodList[moodFillerIdx]!;
  }
  const list = THINKING_FILLERS[(lang as LangCode)] ?? THINKING_FILLERS.en;
  fillerIdx = (fillerIdx + 1) % list.length;
  return list[fillerIdx]!;
}

/** Long soft-tier search line, in the user's language. */
export function pickSearchDelayLine(lang: string): string {
  const L: LangCode = lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'en';
  const bank = SEARCH_DELAY_LINES[L] ?? SEARCH_DELAY_LINES.en;
  searchDelayIdx = (searchDelayIdx + 1) % bank.length;
  return bank[searchDelayIdx]!;
}

/**
 * Cantonese/Mandarin sentence-final particles. These end a sentence ("係呀",
 * "食咗啦"); they are not interjections. Prepending one to a reply makes the
 * character open on a stray syllable, which the owner rejected twice
 * (2026-11-24 "#no-ya", 2026-11-26 "don't say 呀, it is very strange to start
 * with a single word like this"). A single real exclamation (哇/咦/哼) is fine.
 */
export const SENTENCE_FINAL_PARTICLES: ReadonlySet<string> = new Set([
  '呀', '吖', '㗎', '嘅', '啦', '咯', '咩', '呢', '嘛', '啩', '噃', '囉', '咯',
]);

/** True when a tic may be spoken as its own lead. Code points, not UTF-16 halves. */
export function interjectionSpeakable(text: string): boolean {
  const bare = text.replace(/[\s!！?？….,，。~～、]/g, '');
  if (!bare) return false;
  const cps = [...bare];
  if (cps.length === 1 && SENTENCE_FINAL_PARTICLES.has(cps[0]!)) return false;
  return true;
}

/**
 * Strong-emotion vocal tic for the spoken reply — undefined below the
 * intensity threshold, so mild feelings stay prosody-only.
 */
export function pickInterjection(
  emotion: string,
  intensity: number,
  lang: string,
): { text: string; pitch: number; rate: number } | undefined {
  if (intensity < INTERJECTION_AT) return undefined;
  const hit = INTERJECTIONS[emotion]?.[(lang as LangCode)] ?? INTERJECTIONS[emotion]?.en;
  if (!hit || !interjectionSpeakable(hit.text)) return undefined;
  return hit;
}

/** Dominant emotion of a hints bag above the neutral cutoff. Exported for tests. */
export function dominant(hints?: Record<string, number>): { emotion: string; value: number } {
  let best = 'neutral';
  let bestV = 0.35;
  if (hints) {
    for (const [k, v] of Object.entries(hints)) {
      if (typeof v === 'number' && v > bestV) { best = k; bestV = v; }
    }
  }
  return { emotion: best, value: bestV };
}
