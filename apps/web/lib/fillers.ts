// Verbal tics that make the companion feel alive — the ChatGPT-voice layer.
// Two tables:
//  · THINKING_FILLERS — short "hmm…" moments spoken while the reply generates
//  · INTERJECTIONS    — audible reactions (giggles, gasps, sighs) prepended to
//    a spoken reply when the dominant emotion is STRONG (≥ INTERJECTION_AT)
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
/** Round-robin so consecutive sends don't repeat the same "hmm…". */
export function pickThinkingFiller(lang: string): string {
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
