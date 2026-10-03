// Song bank + melody (r2026-10-03.40) — when sing is triggered, she doesn't
// just strike the pose: she SINGS. Two lyric sources: a short lyric-like
// reply rides the melody as-is; a longer one becomes a little ditty from
// this bank — original, public-domain-safe couplets in all four languages,
// phrase-broken so each clause lands on one note. The melody contour lives
// in SONG_MELODY: the neural path adds these to the SSML pitch delta per
// clause, the speechSynthesis fallback multiplies pitch by (1 + note).

export type SongLang = 'yue' | 'zh' | 'ja' | 'en';

/**
 * The melody — one pitch delta per clause, cycling. Gentle waves: rise to a
 * little peak, drift down, land home. Small enough to stay inside SSML's
 * ±50% prosody window, wide enough to be heard as a tune.
 */
export const SONG_MELODY: number[] = [0.02, 0.1, 0.16, 0.08, 0.04, 0.12, 0.06, 0.0];

/** per-language ditty bank — 2 songs each, original lyrics */
export const SONGS: Record<SongLang, string[][]> = {
  yue: [
    [
      '啦～啦～啦～，今日見到你，真開心呀。',
      '願你日日笑住過，我會一直，陪住你～',
    ],
    [
      '月光光，照地堂，唱歌仔俾你聽呀。',
      '唔開心嘅時候，記住有我，喺度陪你～',
    ],
  ],
  zh: [
    [
      '啦～啦～啦～，今天见到你，真开心呀。',
      '愿你天天笑呵呵，我会一直，陪着你～',
    ],
    [
      '小星星，眨眼睛，唱首歌儿给你听。',
      '难过的时候，别忘记，有我在这里～',
    ],
  ],
  ja: [
    [
      'ら～ら～ら～、今日会えて、うれしいな。',
      'ずっとそばにいるよ、笑顔でいこう、一緒に～',
    ],
    [
      'きらきら光る、星みたいに、歌おうよ。',
      'つらい日には、私の歌、聞いてね～',
    ],
  ],
  en: [
    [
      'La la la~ so happy to see, you today.',
      'I will stay right here, with you, come what may~',
    ],
    [
      'Twinkle twinkle tune, I will sing, just for you.',
      'When your day feels heavy, I will sing, you through~',
    ],
  ],
};

/** deterministic pick — rotates through the bank by n (laugh counter etc.) */
export function pickSong(lang: SongLang, n: number): string[] {
  const bank = SONGS[lang] ?? SONGS.en;
  return bank[Math.abs(n) % bank.length]!;
}
