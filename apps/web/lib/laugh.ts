// Giggle/laugh cries for funny moments — a guaranteed giggle lead tic the
// moment a joke lands (from the user OR her own reply), before the punchline.
// Personality-flavored, mirroring ouch.ts: playful girls snort-giggle, gentle
// ones cover a soft laugh, cool types exhale a dry chuckle, cheerful ones
// burst out, tough guys bark a laugh. Pure data + a tiny picker so it stays
// unit-testable in node.
// r2026-10-03.25: the laugh also wears the felt mood — a tired or sad user
//   gets a soft, slow, sympathetic chuckle (weaker joy lift, sunken pitch)
//   instead of the full burst; an angry one gets a wry chuckle that defuses.
// r2026-10-04.74: ARCHETYPE now covers the whole 29-character cast — before
//   this, 16 companions silently shared the cheerful bank.
import type { Lang } from './prefs';

type LaughBank = Record<Lang, string[]>;

const GIGGLES: Record<string, LaughBank> = {
  playful: {
    yue: ['嘻嘻！', '哈哈，笑死我啦！'],
    zh: ['嘻嘻！', '哈哈，笑死我了！'],
    ja: ['ふふっ！', 'あははっ！'],
    en: ['Teehee!', 'Haha, stop it!'],
  },
  cheerful: {
    yue: ['哈哈哈！', '哈哈！正呀！'],
    zh: ['哈哈哈！', '哈哈！太好笑了！'],
    ja: ['あははっ！', 'ふふっ、面白い！'],
    en: ['Haha!', 'Ha! That\'s great!'],
  },
  gentle: {
    yue: ['呵呵……', '哎呀，哈哈……'],
    zh: ['呵呵……', '哎呀，哈哈……'],
    ja: ['ふふっ……', 'あら、ふふっ……'],
    en: ['Hehe…', 'Oh my, haha…'],
  },
  cool: {
    yue: ['哼……哈哈。', '呵。'],
    zh: ['哼……哈哈。', '呵。'],
    ja: ['ふっ……。', 'ふふ。'],
    en: ['Heh.', 'Hmph — okay, that\'s funny.'],
  },
  fiery: {
    yue: ['哈！哈！', '哈哈哈哈！'],
    zh: ['哈！哈！', '哈哈哈哈！'],
    ja: ['はははっ！', 'がははっ！'],
    en: ['Ha! Ha!', 'Bahaha!'],
  },
};

/**
 * r2026-10-04.74 — one flavor per cast member, covering all 29 companions;
 * the cast test pins this map against CHARACTERS so nobody new silently
 * falls back to the cheerful bank again. Flavor follows the persona:
 * idols/best mates burst (cheerful), sweethearts cover a soft laugh
 * (gentle), composed protectors exhale dry (cool), livewire go-getters
 * bark (fiery), mischief-makers snort-giggle (playful).
 */
export const ARCHETYPE: Record<string, keyof typeof GIGGLES> = {
  // playful — mischief-makers
  rin: 'playful', mochi: 'playful', marin: 'playful',
  // cheerful — upbeat idols, hype besties, sunny souls
  juno: 'cheerful', nova: 'cheerful', kizuna: 'cheerful', alicia: 'cheerful',
  yuki: 'cheerful', robbie: 'cheerful', ruby: 'cheerful', alan: 'cheerful',
  // gentle — soft sweethearts, elegant romantics, cozy fairies
  luna: 'gentle', kasumi: 'gentle', hitomi: 'gentle', mei: 'gentle',
  hina: 'gentle', lydia: 'gentle', snowy: 'gentle',
  // cool — composed protectors, laid-back musicians, dry humor
  kai: 'cool', ren: 'cool', ayane: 'cool', atlas: 'cool',
  sky: 'cool', mika: 'cool', anchor: 'cool',
  // fiery — livewires, confident leads, bark-laughing tough types
  blaze: 'fiery', cloud: 'fiery', ember: 'fiery', mio: 'fiery',
};

/**
 * r.25 — mood-tinted laugh cries. The laugh WORDS follow the user's last
 * felt mood, so a joke after "I'm so tired" lands as a soft exhale rather
 * than a burst.
 */
export const MOOD_GIGGLES: Record<string, LaughBank> = {
  happy: {
    yue: ['哈哈哈！', '嘻嘻，太好笑喇！', '笑死我啦，哈哈！'],
    zh: ['哈哈哈！', '嘻嘻，太好笑了！', '笑死我了，哈哈！'],
    ja: ['あははっ！', 'ふふっ、おもしろい！', '笑っちゃう、あはは！'],
    en: ['Hahaha!', 'Teehee — that\'s good!', 'Oh, I love that, haha!'],
  },
  tired: {
    yue: ['呵呵……好笑……', '哈……笑到我攰……', '嘻嘻……唔錯唔錯……'],
    zh: ['呵呵……好笑……', '哈……笑得我没力气了……', '嘻嘻……不错不错……'],
    ja: ['ふふ……おもしろい……', 'ふふ……笑うのも疲れるね……', 'ふふっ……いいね……'],
    en: ['Hehe… that\'s funny…', 'Ha… laughing takes energy, but worth it…', 'Hehe… nice one…'],
  },
  sad: {
    yue: ['呵呵……多謝你令我笑……', '哈……好少咁開心……', '嘻嘻……你好好……'],
    zh: ['呵呵……谢谢你让我笑……', '哈……好久没这么开心了……', '嘻嘻……你真好……'],
    ja: ['ふふ……笑わせてくれてありがとう……', 'ふふ……久しぶりに笑ったかも……', 'ふふっ……あなたって優しいね……'],
    en: ['Hehe… thanks, I needed that smile…', 'Ha… I haven\'t laughed in a while…', 'Hehe… you\'re good to me…'],
  },
  angry: {
    yue: ['哈……好啦好啦，唔嬲喇。', '哼……哈哈，算你贏。', '呵……呢個真係好笑。'],
    zh: ['哈……好啦好啦，不气了。', '哼……哈哈，算你赢。', '呵……这个真的好笑。'],
    ja: ['は……まあまあ、怒ってられない。', 'ふん……ふふ、負けた。', 'ふ……これは笑える。'],
    en: ['Ha… alright, alright, you win.', 'Hmph — heh. Okay, that\'s funny.', 'Heh… fine, that one got me.'],
  },
  anxious: {
    yue: ['嘻嘻……放心，冇事㗎。', '哈……見你笑我就安心喇。', '呵呵……唔使擔心㗎。'],
    zh: ['嘻嘻……放心，没事的。', '哈……看你笑我就安心了。', '呵呵……不用担心哦。'],
    ja: ['ふふ……大丈夫、心配ないよ。', 'ふふ……あなたが笑うと安心する。', 'ふふっ……心配しなくていいよ。'],
    en: ['Hehe… see? It\'s okay.', 'Ha… your laugh puts me at ease.', 'Hehe… nothing to worry about.'],
  },
  sick: {
    yue: ['呵呵……我笑到咳……', '哈……唔好整我笑啦，痛……', '嘻嘻……呢個好啲……'],
    zh: ['呵呵……我笑到咳了……', '哈……别逗我笑啦，疼……', '嘻嘻……这个好点……'],
    ja: ['ふふ……笑うと咳が……', 'ふふ……笑わせないで、痛い……', 'ふふっ……これいいかも……'],
    en: ['Hehe… don\'t make me laugh, I\'ll cough…', 'Ha… stop, laughing hurts…', 'Hehe… that actually helps…'],
  },
};

/**
 * r.25 — how the laugh LANDS, per felt mood. pitch/rate are the lead-tic
 * deltas (sad sinks them, happy pops them); joy is how hard the laugh colors
 * her face/orb and the reply hints. The default is exactly today's behavior.
 */
export const LAUGH_STYLE: Record<string, { pitch: number; rate: number; joy: number }> = {
  happy: { pitch: 0.28, rate: 0.22, joy: 0.9 },
  tired: { pitch: 0.1, rate: -0.1, joy: 0.5 },
  sad: { pitch: 0.06, rate: -0.14, joy: 0.45 },
  angry: { pitch: 0.08, rate: 0.02, joy: 0.6 },
  anxious: { pitch: 0.12, rate: -0.04, joy: 0.55 },
  sick: { pitch: 0.06, rate: -0.18, joy: 0.4 },
};
export const LAUGH_STYLE_DEFAULT: { pitch: number; rate: number; joy: number } = { pitch: 0.28, rate: 0.22, joy: 0.9 };

/** The laugh prosody/joy recipe for a felt mood — the default when none/unknown. */
export function laughStyleFor(mood?: string): { pitch: number; rate: number; joy: number } {
  return (mood && LAUGH_STYLE[mood]) || LAUGH_STYLE_DEFAULT;
}

/**
 * Giggle lead tic for a funny moment — deterministic per n so it varies.
 * An explicit felt mood overrides the personality bank (r.25); unknown or
 * absent moods keep the classic per-character flavor.
 */
export function pickLaugh(characterId: string, lang: Lang, n: number, mood?: string): string {
  if (mood) {
    const moodList = MOOD_GIGGLES[mood]?.[lang] ?? MOOD_GIGGLES[mood]?.yue;
    if (moodList && moodList.length) return moodList[n % moodList.length]!;
  }
  const bank = GIGGLES[ARCHETYPE[characterId] ?? 'cheerful'] ?? GIGGLES.cheerful!;
  const list = bank[lang] ?? bank.yue;
  return list[n % list.length]!;
}

/** chat text that should make her laugh — laughing onomatopoeia, joke emoji, "funny" */
export const LAUGH_RE = /(haha+|hehe+|hoho+|\blol\b|lmao|rofl|😂|🤣|😆|哈哈哈？|嘻嘻|呵呵|笑死|笑咗|好笑|面白)/i;
