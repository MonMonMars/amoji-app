// Short pain/surprise cries for the poke reaction — spoken instantly as the
// "lead" tic (neural + browser TTS) the moment the user pokes her, before the
// full personality poke line. Personality-flavored: playful girls squeak,
// gentle ones gasp softly, cool types grunt, tough guys bark.
// r2026-10-03.26: the poke reaction also wears the felt mood — poking her
//   while you're sad gets a gentle, almost apologetic gasp instead of a yelp,
//   a tired one a low soft "oh…", an angry one a wry "hey—" that defuses
//   instead of snapping back; no/unknown mood keeps the classic personality
//   cry (and the exact old voice + hint numbers).
// r2026-10-04.74: ARCHETYPE now covers the whole 33-character cast (r104) — before
//   this, 16 companions silently shared the cheerful squeak.
import type { Lang } from './prefs';

type CryBank = Record<Lang, string[]>;

const OUCH: Record<string, CryBank> = {
  playful: {
    yue: ['呀！', '哎呀！'],
    zh: ['呀！', '哎呀！'],
    ja: ['きゃっ！', 'わっ！'],
    en: ['Eek!', 'Ah!'],
  },
  cheerful: {
    yue: ['哎呀！', '啊！'],
    zh: ['哎呀！', '啊！'],
    ja: ['わっ！', 'あっ！'],
    en: ['Ah!', 'Oh!'],
  },
  gentle: {
    yue: ['吖…！', '哎呀！'],
    zh: ['啊…！', '哎呀！'],
    ja: ['きゃっ！', 'あらっ！'],
    en: ['Oh!', 'Eep!'],
  },
  cool: {
    yue: ['喂。', '啧。'],
    zh: ['喂。', '啧。'],
    ja: ['っ……！', 'ちっ。'],
    en: ['Hmph!', 'Hey—'],
  },
  fiery: {
    yue: ['喂呀！', '唔！'],
    zh: ['喂呀！', '唔！'],
    ja: ['ぐっ……！', 'おい！'],
    en: ['Ow!', 'Hey!'],
  },
};

/**
 * r2026-10-04.74 — one flavor per cast member, covering all 33 companions;
 * kept in lockstep with laugh.ts ARCHETYPE (the cast test pins both maps
 * against CHARACTERS). Flavor follows the persona: idols/besties yelp
 * bright (cheerful), sweethearts gasp soft (gentle), composed protectors
 * grunt dry (cool), livewires bark (fiery), mischief-makers squeak (playful).
 */
export const ARCHETYPE: Record<string, keyof typeof OUCH> = {
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
  // remote community cast (r.104)
  aera: 'gentle', dhahlia: 'cheerful', onyx: 'cool', velara: 'gentle',
};

/**
 * r.26 — mood-tinted poke cries. The cry WORDS follow the user's last felt
 * mood, so a poke after "I'm so tired" lands as a low soft "oh…" rather
 * than a bright yelp, and a poke while she's cheering up an angry user is
 * wry and defusing instead of snapping back.
 */
export const MOOD_OUCHES: Record<string, CryBank> = {
  happy: {
    yue: ['呀！', '哎呀！', '哈哈，做咩呀！'],
    zh: ['呀！', '哎呀！', '哈哈，干嘛呀！'],
    ja: ['きゃっ！', 'わっ！', 'ふふっ、なに！'],
    en: ['Eek!', 'Ah!', 'Haha, hey!'],
  },
  tired: {
    yue: ['唉呀…', '唔…嚇親…', '哎呀…好攰…'],
    zh: ['哎呀…', '唔…吓我一跳…', '哎呀…好累…'],
    ja: ['わっ…', 'ふぅ…びっくり…', 'あっ…疲れた…'],
    en: ['Oh…', 'Ugh, you startled me…', 'Ah… so tired…'],
  },
  sad: {
    yue: ['吖…唔好意思…', '唉呀…我冇事…', '唔…吓…'],
    zh: ['啊…不好意思…', '哎呀…我没事…', '唔…吓…'],
    ja: ['あっ…ごめん…', 'あら…大丈夫…', 'ん…びっくり…'],
    en: ['Oh… sorry…', 'Ah… I\'m okay…', 'Eep…'],
  },
  angry: {
    yue: ['喂！', '哼……算喇。', '唉，你呀……'],
    zh: ['喂！', '哼……算了。', '唉，你啊……'],
    ja: ['おい！', 'ふん……まあいい。', 'まったく……'],
    en: ['Hey!', 'Hmph… fine.', 'Oh, you…'],
  },
  anxious: {
    yue: ['呀！冇事冇事！', '哎呀！嚇死我…', '吓……你喺度呀……'],
    zh: ['呀！没事没事！', '哎呀！吓死我了…', '吓……你在这儿呀……'],
    ja: ['きゃっ！大丈夫！', 'わっ！びっくりした…', 'ひゃっ……いたの……'],
    en: ['Eep! I\'m okay!', 'Ah! You scared me…', 'Eep… you\'re here…'],
  },
  sick: {
    yue: ['唉…痛……', '唔…好痛……', '哎呀…我頭痛…'],
    zh: ['唉…痛……', '唔…好痛……', '哎呀…我头疼…'],
    ja: ['いたっ……', 'うぅ…痛い……', 'あら…頭が痛い…'],
    en: ['Ow…', 'Ugh… that hurt…', 'Oh… my head…'],
  },
};

/**
 * r.26 — how the poke LANDS, per felt mood. pitch/rate tint the lead cry
 * (sad/sick sink and slow it, happy pops it); surprise/joy tint her face,
 * orb and the poke-line hints (a sad user gets a gentle, low-surprise
 * reaction, not a full startle). The default is exactly today's behavior.
 */
export const OUCH_STYLE: Record<string, { pitch: number; rate: number; surprise: number; joy: number }> = {
  happy: { pitch: 0.32, rate: 0.18, surprise: 0.85, joy: 0.7 },
  tired: { pitch: 0.14, rate: -0.1, surprise: 0.5, joy: 0.3 },
  sad: { pitch: 0.1, rate: -0.15, surprise: 0.45, joy: 0.2 },
  angry: { pitch: 0.18, rate: 0.04, surprise: 0.7, joy: 0.35 },
  anxious: { pitch: 0.22, rate: 0.06, surprise: 0.75, joy: 0.4 },
  sick: { pitch: 0.08, rate: -0.18, surprise: 0.4, joy: 0.2 },
};
export const OUCH_STYLE_DEFAULT: { pitch: number; rate: number; surprise: number; joy: number } =
  { pitch: 0.3, rate: 0.15, surprise: 0.8, joy: 0.4 };

/** The poke prosody/surprise/joy recipe for a felt mood — the default when none/unknown. */
export function ouchStyleFor(mood?: string): { pitch: number; rate: number; surprise: number; joy: number } {
  return (mood && OUCH_STYLE[mood]) || OUCH_STYLE_DEFAULT;
}

/**
 * Instant ouch cry for a poke — deterministic per poke count so it varies.
 * An explicit felt mood overrides the personality bank (r.26); unknown or
 * absent moods keep the classic per-character flavor.
 */
export function pickOuch(characterId: string, lang: Lang, n: number, mood?: string): string {
  if (mood) {
    const moodList = MOOD_OUCHES[mood]?.[lang] ?? MOOD_OUCHES[mood]?.yue;
    if (moodList && moodList.length) return moodList[n % moodList.length]!;
  }
  const bank = OUCH[ARCHETYPE[characterId] ?? 'cheerful'] ?? OUCH.cheerful!;
  const list = bank[lang] ?? bank.yue;
  return list[n % list.length]!;
}
