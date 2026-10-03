// Verbal tics that make the companion feel alive — the ChatGPT-voice layer.
// Two tables:
//  · THINKING_FILLERS — short "hmm…" moments spoken while the reply generates
//  · INTERJECTIONS    — audible reactions (giggles, gasps, sighs) prepended to
//    a spoken reply when the dominant emotion is STRONG (≥ INTERJECTION_AT)
// r2026-10-03.24: the first "hmm…" now wears the felt mood — a sad user's hmm
//   is softer ("take your time… I'm with you…") than a happy one's. The mood
//   bank wins when present; the neutral path is byte-identical to before.
// Pure data + tiny pickers so it stays unit-testable in node.

export type LangCode = 'yue' | 'zh' | 'ja' | 'en';

/** below this intensity the emotion is felt in prosody only, not a vocal tic */
export const INTERJECTION_AT = 0.6;

export const THINKING_FILLERS: Record<LangCode, string[]> = {
  yue: ['嗯……', '諗緊喎……', '等等呀……'],
  zh: ['嗯……', '我想想……', '等等哦……'],
  ja: ['うーん……', '考えてる……', 'ちょっと待ってね……'],
  en: ['hmm……', 'let me think……', 'one sec……'],
};

/**
 * r2026-10-03.24 — mood-tinted first "hmm…". When she has just FELT the
 * user's mood, the filler that buys her thinking time matches the user's
 * weather instead of staying neutral.
 */
export const MOOD_FILLERS: Record<string, Record<LangCode, string[]>> = {
  happy: {
    yue: ['嗯！……', '開心嘅嘢，等我諗下……', '好呀好呀……等我講……'],
    zh: ['嗯！……', '开心的事，让我想想……', '好呀好呀……让我讲……'],
    ja: ['うん！……', '嬉しい話、考えさせて……', 'うんうん……言うね……'],
    en: ['hmm, okay!……', 'happy things, let me think……', 'okay okay… let me say this right……'],
  },
  tired: {
    yue: ['嗯……慢慢諗……', '等我唞住諗……', '攰就慢慢嚟……我等你……'],
    zh: ['嗯……慢慢想……', '让我边休息边想……', '累了就慢慢来……我等你……'],
    ja: ['うーん……ゆっくり考える……', '少し休みながら考えるね……', '疲れたらゆっくりでいいよ……'],
    en: ['hmm… thinking slowly…', 'let me think… no rush at all…', 'if you\'re tired… we take it slow…'],
  },
  sad: {
    yue: ['嗯……我喺度諗……', '慢慢嚟……我陪住你……', '嗯……唔緊要，等我……'],
    zh: ['嗯……我在想着呢……', '慢慢来……我陪着你……', '嗯……没关系，等我……'],
    ja: ['うーん……考えてるからね……', 'ゆっくりでいいよ……一緒に考える……', 'うん……大丈夫、待ってて……'],
    en: ['hmm… I\'m here, thinking…', 'take your time… I\'m with you…', 'it\'s okay… let me…'],
  },
  angry: {
    yue: ['嗯……我聽緊……', '等我諗下……慢慢講……', '我喺度㗎……等我……'],
    zh: ['嗯……我在听……', '让我想想……慢慢说……', '我在呢……等我……'],
    ja: ['うん……聞いてるよ……', '考えるから……ゆっくり話して……', 'ここにいるよ……待ってて……'],
    en: ['hmm… I\'m listening…', 'let me think… go on, let it out…', 'I\'m here… hold on…'],
  },
  anxious: {
    yue: ['嗯……唔使急㗎……', '等我諗清楚先……唔緊張……', '慢慢嚟，我喺度……'],
    zh: ['嗯……不用急的……', '让我想清楚……别紧张……', '慢慢来，我在……'],
    ja: ['うん……急がなくていいからね……', 'ちゃんと考えるね……大丈夫……', 'ゆっくり、私がいるよ……'],
    en: ['hmm… no rush at all…', 'let me think it through… breathe…', 'easy… I\'m right here…'],
  },
  sick: {
    yue: ['嗯……你休息住……', '等我諗……你唔使郁……', '慢慢嚟……我幫你諗……'],
    zh: ['嗯……你休息着……', '让我想想……你不用动……', '慢慢来……我帮你想……'],
    ja: ['うん……あなたは休んでて……', '考えるから……動かなくていいよ……', 'ゆっくりね……私が考えておく……'],
    en: ['hmm… you rest…', 'let me think… you don\'t need to move…', 'easy… I\'ll do the thinking…'],
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
