// Giggle/laugh cries for funny moments — a guaranteed giggle lead tic the
// moment a joke lands (from the user OR her own reply), before the punchline.
// Personality-flavored, mirroring ouch.ts: playful girls snort-giggle, gentle
// ones cover a soft laugh, cool types exhale a dry chuckle, cheerful ones
// burst out, tough guys bark a laugh. Pure data + a tiny picker so it stays
// unit-testable in node.
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

const ARCHETYPE: Record<string, keyof typeof GIGGLES> = {
  juno: 'cheerful', nova: 'cheerful', rin: 'playful',
  mochi: 'playful', marin: 'playful',
  luna: 'gentle', aerith: 'gentle', kasumi: 'gentle', hitomi: 'gentle',
  kai: 'cool', ren: 'cool', ayane: 'cool',
  blaze: 'fiery', cloud: 'fiery', tifa: 'fiery',
};

/** Giggle lead tic for a funny moment — deterministic per n so it varies. */
export function pickLaugh(characterId: string, lang: Lang, n: number): string {
  const bank = GIGGLES[ARCHETYPE[characterId] ?? 'cheerful'] ?? GIGGLES.cheerful!;
  const list = bank[lang] ?? bank.yue;
  return list[n % list.length]!;
}

/** chat text that should make her laugh — laughing onomatopoeia, joke emoji, "funny" */
export const LAUGH_RE = /(haha+|hehe+|hoho+|\blol\b|lmao|rofl|😂|🤣|😆|哈哈哈？|嘻嘻|呵呵|笑死|笑咗|好笑|面白)/i;
