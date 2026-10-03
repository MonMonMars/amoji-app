// Short pain/surprise cries for the poke reaction — spoken instantly as the
// "lead" tic (neural + browser TTS) the moment the user pokes her, before the
// full personality poke line. Personality-flavored: playful girls squeak,
// gentle ones gasp softly, cool types grunt, tough guys bark.
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

const ARCHETYPE: Record<string, keyof typeof OUCH> = {
  juno: 'cheerful', nova: 'cheerful', rin: 'playful',
  mochi: 'playful', marin: 'playful',
  luna: 'gentle', aerith: 'gentle', kasumi: 'gentle', hitomi: 'gentle',
  kai: 'cool', ren: 'cool', ayane: 'cool',
  blaze: 'fiery', cloud: 'fiery', tifa: 'fiery',
};

/** Instant ouch cry for a poke — deterministic per poke count so it varies. */
export function pickOuch(characterId: string, lang: Lang, n: number): string {
  const bank = OUCH[ARCHETYPE[characterId] ?? 'cheerful'] ?? OUCH.cheerful!;
  const list = bank[lang] ?? bank.yue;
  return list[n % list.length]!;
}
