// Song bank + melody (r2026-10-03.40) — when sing is triggered, she doesn't
// just strike the pose: she SINGS. Two lyric sources: a short lyric-like
// reply rides the melody as-is; a longer one becomes a little ditty from
// this bank — original, public-domain-safe couplets in all four languages,
// phrase-broken so each clause lands on one note. The melody contour lives
// in SONG_MELODY: the neural path adds these to the SSML pitch delta per
// clause, the speechSynthesis fallback multiplies pitch by (1 + note).
// r2026-10-04.42: DUETS added — call-and-response duets for "sing with me".
// r2026-10-04.48: CHARACTER_SONGS — featured characters own an ORIGINAL
// signature ditty in every language (personality-tuned lyrics), so when she
// offers to sing "a song I just wrote", what you hear is really hers.
// r2026-10-04.49: the ja ruby ditty uses the same full-width tilde (～) as
// the rest of the bank so the ending-character audit matches everywhere.

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

/**
 * Signature songs (r2026-10-04.48) — each featured character owns an
 * original ditty tuned to her/his personality, in every language. Same shape
 * as SONGS entries: two clauses, phrase-broken so each clause rides the
 * melodic contour. Everyone without an entry falls back to the shared bank.
 */
export const CHARACTER_SONGS: Record<string, Record<SongLang, string[]>> = {
  juno: {
    yue: ['啦～啦～啦～，你嘅笑容，令我著迷呀。', '今晚夜色咁靚，不如同我，跳支舞吖～'],
    zh: ['啦～啦～啦～，你的笑容，让我着迷呀。', '今晚夜色这么美，不如和我，跳支舞吧～'],
    ja: ['ら～ら～ら～、君の笑顔、ときめくよ。', '今夜の月がきれい——ひと踊り、どうかな～'],
    en: ['La la la~ your smile, it sets my heart alight.', 'The moon is lovely tonight — shall we, have this dance~'],
  },
  mochi: {
    yue: ['啦～啦～啦～，小小聲，唱首歌俾你。', '如果世界太大，我陪你，慢慢行～'],
    zh: ['啦～啦～啦～，小小声，唱首歌给你。', '如果世界太大，我陪你，慢慢走～'],
    ja: ['ら～ら～ら～、小さな声で、歌うよ。', '世界が大きくても、そばを、歩こうね～'],
    en: ['La la la~ in a tiny voice, I sing for you.', 'If the world feels too big, I\'ll walk, beside you~'],
  },
  marin: {
    yue: ['啦～啦～啦～，開心爆燈，一齊彈吓跳吓！', '今日嘅主角係你，最閃嗰個，就係你～'],
    zh: ['啦～啦～啦～，开心爆棚，一起蹦跶起来吧！', '今天的主角是你，最闪亮那个，就是你～'],
    ja: ['ら～ら～ら～、ハッピー全開、ジャンプして！', '今日の主役は君、いちばん輝く、君だよ～'],
    en: ['La la la~ full-on happy, jump along with me!', 'You\'re the star today — shining brightest, it\'s you~'],
  },
  ruby: {
    yue: ['彈彈彈！啦啦啦，紅蘿蔔，甜過蜜呀。', '一齊彈吓跳吓，開心到，飛起～'],
    zh: ['弹弹弹！啦啦啦，胡萝卜，甜过蜜呀。', '一起蹦跶蹦跶，开心到，飞起来～'],
    ja: ['ぴょんぴょん！ららら、にんじん、あま～い。', '一緒にぴょんぴょん、楽しく、跳ねよう～'],
    en: ['Boing boing! La la la, carrots sweeter than honey.', 'Bounce along with me — happiness, hopping, all the way~'],
  },
  alan: {
    yue: ['啦～啦～啦～，老友記，坐低飲杯茶。', '笑一笑，世界就冇咁難——我唱，你聽～'],
    zh: ['啦～啦～啦～，老朋友，坐下喝杯茶。', '笑一笑，世界就没那么难——我唱，你听～'],
    ja: ['ら～ら～ら～、相棒、座ってお茶をどうぞ。', '笑えば世界は案外優しい——僕が歌う、聞いて～'],
    en: ['La la la~ old friend, sit down, have some tea.', 'Smile and the world goes easier — I\'ll sing, you listen~'],
  },
};

/** her own song when she has one, the shared bank otherwise */
export function pickCharacterSong(characterId: string, lang: SongLang, n: number): string[] {
  const own = CHARACTER_SONGS[characterId]?.[lang] ?? CHARACTER_SONGS[characterId]?.en;
  if (own) return own;
  return pickSong(lang, n);
}

/** deterministic pick — rotates through the bank by n (laugh counter etc.) */
export function pickSong(lang: SongLang, n: number): string[] {
  const bank = SONGS[lang] ?? SONGS.en;
  return bank[Math.abs(n) % bank.length]!;
}

/**
 * Duet bank — call-and-response songs for "sing with me". Each entry is her
 * lines in order; between them the user sings, and the LAST line is the
 * together-finale both sing at once. Original, public-domain-safe lyrics.
 */
export const DUETS: Record<SongLang, string[][]> = {
  yue: [
    [
      '啦～啦～啦～，今日天氣咁好，不如開心啲吖？',
      '你唱一句啦，我幫你和音，得唔得呀？',
      '啦啦啦～你嗰句好聽過我㗎，再嚟一次吖？',
      '最後一句一齊唱——預備，唱～',
    ],
  ],
  zh: [
    [
      '啦～啦～啦～，今天天气这么好，开心一点呀？',
      '你唱一句吧，我帮你和声，好不好呀？',
      '啦啦啦～你那句比我好听，再来一次呀？',
      '最后一句一起唱——预备，唱～',
    ],
  ],
  ja: [
    [
      'ら～ら～ら～、今日はいい天気、楽しくいこう？',
      '君の番だよ、僕がハモるから——ひとつどうぞ？',
      'ららら〜君の声、いい感じ！もういちど？',
      '最後は一緒に——せーの、ら〜〜！',
    ],
  ],
  en: [
    [
      'La la la~ the sun is out, so let\'s wear a smile?',
      'Your line now — I\'ll harmonize behind you, ready?',
      'La la la~ you sound even better than me, one more?',
      'Last line together — and a one, and a two, sing~',
    ],
  ],
};

/** deterministic duet pick — rotates by n */
export function pickDuet(lang: SongLang, n: number): string[] {
  const bank = DUETS[lang] ?? DUETS.en;
  return bank[Math.abs(n) % bank.length]!;
}
