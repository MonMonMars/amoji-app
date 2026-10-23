// Spoken while a reply is still loading. Stubs only: a sound, or one tiny
// "let me think / let me search" line on a longer wait. Not a conversation.

export const LOADING_STUBS = {
  yue: [
    '嗯……',
    '哈……',
    '嗯…',
    '嗯嗯……',
    '嗯……等我諗下。',
    '嗯……等我上網搵下。',
  ],
  zh: [
    '嗯……',
    '哈……',
    '嗯…',
    '嗯嗯……',
    '嗯……让我想想。',
    '嗯……让我上网查一下。',
  ],
  ja: [
    'うーん……',
    'はあ……',
    'えっと…',
    'うん……',
    'うーん……考えさせて。',
    'うーん……ネットで調べるね。',
  ],
  en: [
    'um……',
    'ha……',
    'um…',
    'hmm……',
    'um…… let me think.',
    'um…… let me search the web.',
  ],
} as const;

/** Cantonese loading stubs. Same list the warm-up bank speaks. */
export const YUE_THINKING_LINES: readonly string[] = LOADING_STUBS.yue;

/**
 * Mood only swaps which stub comes first. Still a sound, or the same tiny
 * think / search line. No comfort speech.
 */
export const LOADING_MOOD_STUBS = {
  happy: {
    yue: ['哈……', '嗯……', '嗯……等我諗下。'],
    zh: ['哈……', '嗯……', '嗯……让我想想。'],
    ja: ['はあ……', 'うーん……', 'うーん……考えさせて。'],
    en: ['ha……', 'um……', 'um…… let me think.'],
  },
  tired: {
    yue: ['嗯…', '嗯……', '嗯……等我諗下。'],
    zh: ['嗯…', '嗯……', '嗯……让我想想。'],
    ja: ['えっと…', 'うーん……', 'うーん……考えさせて。'],
    en: ['um…', 'um……', 'um…… let me think.'],
  },
  sad: {
    yue: ['哈……', '嗯……', '嗯……等我諗下。'],
    zh: ['哈……', '嗯……', '嗯……让我想想。'],
    ja: ['はあ……', 'うーん……', 'うーん……考えさせて。'],
    en: ['ha……', 'um……', 'um…… let me think.'],
  },
  angry: {
    yue: ['嗯……', '哈……', '嗯……等我上網搵下。'],
    zh: ['嗯……', '哈……', '嗯……让我上网查一下。'],
    ja: ['うーん……', 'はあ……', 'うーん……ネットで調べるね。'],
    en: ['um……', 'ha……', 'um…… let me search the web.'],
  },
  anxious: {
    yue: ['嗯…', '嗯嗯……', '嗯……等我諗下。'],
    zh: ['嗯…', '嗯嗯……', '嗯……让我想想。'],
    ja: ['えっと…', 'うん……', 'うーん……考えさせて。'],
    en: ['um…', 'hmm……', 'um…… let me think.'],
  },
  sick: {
    yue: ['嗯……', '嗯…', '嗯……等我上網搵下。'],
    zh: ['嗯……', '嗯…', '嗯……让我上网查一下。'],
    ja: ['うーん……', 'えっと…', 'うーん……ネットで調べるね。'],
    en: ['um……', 'um…', 'um…… let me search the web.'],
  },
} as const;
