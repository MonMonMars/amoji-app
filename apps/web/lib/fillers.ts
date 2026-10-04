// Verbal tics that make the companion feel alive — the ChatGPT-voice layer.
// Two tables:
//  · THINKING_FILLERS — short "hmm…" moments spoken while the reply generates
//  · INTERJECTIONS    — audible reactions (giggles, gasps, sighs) prepended to
//    a spoken reply when the dominant emotion is STRONG (≥ INTERJECTION_AT)
// r2026-10-03.24: the first "hmm…" now wears the felt mood — a sad user's hmm
//   is softer than a happy one's. The mood bank wins when present.
// r2026-10-04.90: every thinking filler is now strictly loading-flavored —
//   um / let me think / let me search the internet / still searching. No more
//   off-topic comforting lines (per Simon): these tics exist ONLY to buy
//   thinking time, so they all sound like thinking/searching.
// Pure data + tiny pickers so it stays unit-testable in node.

export type LangCode = 'yue' | 'zh' | 'ja' | 'en';

/** below this intensity the emotion is felt in prosody only, not a vocal tic */
export const INTERJECTION_AT = 0.6;

export const THINKING_FILLERS: Record<LangCode, string[]> = {
  yue: ['嗯……', '等我諗諗……', '等我上網搵下……', '搵緊呀……', '諗緊諗緊……'],
  zh: ['嗯……', '让我想想……', '我上网搜一下……', '搜索中……', '想一下想一下……'],
  ja: ['うーん……', '考えてる……', '検索してるね……', '調べてる……', 'もう少し……'],
  en: ['hmm……', 'let me think……', 'let me search the internet……', 'still searching……', 'umm, one moment……'],
};

/**
 * r2026-10-03.24 — mood-tinted first "hmm…". r2026-10-04.90 — mood now only
 * changes the TONE (fast/slow/soft) of a thinking/searching line, never the
 * topic: every entry below is still about thinking or searching.
 */
export const MOOD_FILLERS: Record<string, Record<LangCode, string[]>> = {
  happy: {
    yue: ['嗯！等我諗下……', '好開心，等我搵下資料……', '等我上網查下先……'],
    zh: ['嗯！让我想想……', '好开心，让我查一下……', '我上网搜搜看……'],
    ja: ['うん！考えてる……', '嬉しい、検索するね……', '調べてるよ……'],
    en: ['hmm, okay! let me think……', 'happy question — searching for it……', 'looking that up……'],
  },
  tired: {
    yue: ['嗯……慢慢諗……', '等我慢慢搵……', '搵緊，唔使急……'],
    zh: ['嗯……慢慢想……', '让我慢慢搜……', '搜着呢，不急……'],
    ja: ['うーん……ゆっくり考える……', 'ゆっくり検索するね……', '探してるよ、急がなくていい……'],
    en: ['hmm… thinking slowly…', 'searching… no rush…', 'looking… take your time…'],
  },
  sad: {
    yue: ['嗯……我諗緊……', '等我慢慢搵下……', '搵緊㗎……等我……'],
    zh: ['嗯……我在想着呢……', '让我慢慢搜一下……', '搜着呢……等我……'],
    ja: ['うーん……考えてるからね……', 'ゆっくり調べるね……', '探してるよ……待ってて……'],
    en: ['hmm… thinking…', 'searching… hold on…', 'still looking…'],
  },
  angry: {
    yue: ['嗯……我聽緊，等我諗……', '等我搵下先……', '諗緊，慢慢講……'],
    zh: ['嗯……我在听，让我想想……', '让我搜一下先……', '想着呢，慢慢说……'],
    ja: ['うん……聞いてる、考えてる……', '検索するね……', '考え中……ゆっくり話して……'],
    en: ['hmm… listening, let me think…', 'searching… go on…', 'thinking it over…'],
  },
  anxious: {
    yue: ['嗯……唔使急，等我搵……', '等我諗清楚先……', '搵緊㗎，好快……'],
    zh: ['嗯……不用急，让我搜……', '让我想清楚先……', '搜着呢，很快……'],
    ja: ['うん……急がなくていい、考えてる……', 'ちゃんと調べるね……', '探してるよ、もう少し……'],
    en: ['hmm… no rush, thinking…', 'searching carefully…', 'almost got it…'],
  },
  sick: {
    yue: ['嗯……你休息，我搵緊……', '等我諗，你唔使郁……', '我幫你上網搵下……'],
    zh: ['嗯……你休息，我来搜……', '让我想，你不用动……', '我帮你上网查下……'],
    ja: ['うん……あなたは休んで、調べるね……', '考えるから…動かなくていいよ……', '検索しておくね……'],
    en: ['hmm… you rest, I\'ll search…', 'let me think… you don\'t need to move…', 'looking it up for you…'],
  },
};

/**
 * Audible emotion reactions, per language. pitch/rate are SSML-style deltas
 * applied to the tic itself (giggles pop up, sighs sink down).
 */
export const INTERJECTIONS: Record<string, Partial<Record<LangCode, { text: string; pitch: number; rate: number }>>> = {
  joy: {
    yue: { text: '哈哈！', pitch: 0.16, rate: 0.14 },
    zh: { text: '哈哈！', pitch: 0.16, rate: 0.14 },
    ja: { text: 'ふふっ！', pitch: 0.14, rate: 0.12 },
    en: { text: 'hehe!', pitch: 0.16, rate: 0.14 },
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
    ja: { text: 'えっと……', pitch: 0.1, rate: -0.08 },
    en: { text: 'huh?', pitch: 0.12, rate: -0.06 },
  },
};

let fillerIdx = 0;
let moodFillerIdx = 0;
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
