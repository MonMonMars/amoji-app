// Thinking-out-loud phases — what she says while the LLM is still generating
// her reply. ChatGPT voice hums "hmm…" while it thinks; Amoji characters run
// a whole personality-curved sequence (um…… → let me think… → let me search
// the internet… please wait → uuuuummmm), each new phase cutting the previous
// one, so a slow reply sounds like a person thinking, never like a spinner.
import type { Lang } from './prefs';

type PhraseBank = Record<Lang, string[]>;

const PHASES: Record<string, PhraseBank> = {
  cheerful: {
    yue: ['嗯……', '等我諗下吖……', '好吖……我……', '等我睇睇先……', '等我上網查下……等陣呀', '嗯嗯嗯……諗緊!'],
    zh: ['嗯……', '让我想想……', '好……我……', '让我看看……', '让我上网查一下……请稍等', '嗯嗯嗯……在想啦'],
    ja: ['うーん……', '考えさせて……', 'えっと……あたし……', 'ちょっと見てみるね……', 'ネットで調べるから……待ってて', 'うーんうーん……考え中!'],
    en: ['Um……', 'Let me think…', 'Okay… I\'m…', 'Let me see…', 'Let me search the internet… please wait', 'Ummm, thinking!'],
  },
  playful: {
    yue: ['咦……', '等等吓……', '嗯哼……等我諗下', '等我挖挖資料……', '上網查緊……好快㗎啦', '嗯……嗯……呀!'],
    zh: ['咦……', '等等哈……', '嗯哼……让我想想', '让我翻翻资料……', '正在上网查……很快啦', '嗯……嗯……呀!'],
    ja: ['えーっと……', 'ちょっと待ってね……', 'うんうん……考えてる', '資料を探してる……', 'ネット検索中……すぐだよ', 'うーん……うーん……あ!'],
    en: ['Ooh, um……', 'Hold on…', 'Hmm-hmm, thinking~', 'Let me dig something up…', 'Searching the web… almost!', 'Hmm… hmm… oh!'],
  },
  gentle: {
    yue: ['嗯……', '俾少少時間我……', '我諗緊……', '等我慢慢睇睇……', '我去查一查……請等等我', '嗯……就快喇……'],
    zh: ['嗯……', '给我一点时间……', '我在想……', '让我慢慢看看……', '我去查一查……请等等我', '嗯……就快了……'],
    ja: ['えっと……', '少し待ってて……', '考えてるの……', 'ゆっくり見させて……', '調べてくるね……待ってて', 'うーん……もう少し……'],
    en: ['Um……', 'Give me a moment…', 'I\'m thinking…', 'Let me look carefully…', 'Let me go check… please wait', 'Hmm… almost there…'],
  },
  cool: {
    yue: ['嗯。', '諗緊。', '……等我睇清楚。', '查緊資料。等。', '上網搵緊。唔好催。', '……好快。'],
    zh: ['嗯。', '在想。', '……让我看清楚。', '在查资料。等着。', '正在上网找。别催。', '……很快。'],
    ja: ['ふむ。', '考えてる。', '……ちゃんと見てる。', '資料を調べてる。待ってろ。', '検索中。急かすな。', '……もう少しだ。'],
    en: ['Hmm.', 'Thinking.', '…Let me look.', 'Checking. Wait.', 'Searching now. Don\'t rush me.', '…Almost.'],
  },
  fiery: {
    yue: ['喂，等陣！諗緊呀！', '嗯……好煩，等我諗下！', '得啦得啦……我諗緊！', '等我打開資料睇睇！', '上網查緊！唔准走！', '嗯嗯嗯——想到喇！'],
    zh: ['喂，等等！我在想！', '嗯……别急，让我想想！', '行了行了……我在想！', '等我打开资料看看！', '正在上网查！不许走！', '嗯嗯嗯——想到了！'],
    ja: ['おい、待て！考えてる！', 'ん……焦るなよ、考えてる！', 'わかったわかった……考え中！', '資料を開いてる！', 'ネットで調べてる！離れるな！', 'んんん——思いついた！'],
    en: ['Hey, hold on! Thinking!', 'Ngh… don\'t rush me!', 'Alright, alright… thinking!', 'Pulling up my notes!', 'Searching the web! Stay right there!', 'Nnn— got it!'],
  },
};

const ARCHETYPE: Record<string, keyof typeof PHASES> = {
  juno: 'cheerful', nova: 'cheerful', rin: 'playful',
  mochi: 'playful', marin: 'playful',
  luna: 'gentle', aerith: 'gentle', kasumi: 'gentle', hitomi: 'gentle',
  kai: 'cool', ren: 'cool', ayane: 'cool',
  blaze: 'fiery', cloud: 'fiery', tifa: 'fiery',
};

/**
 * The n-th thinking-out-loud phase for a character (0-based). Deterministic
 * per phase index so a slow reply walks the same escalating sequence; wraps
 * around if the wait outlasts the bank.
 */
export function pickThinkPhrase(characterId: string, lang: Lang, phase: number): string {
  const bank = PHASES[ARCHETYPE[characterId] ?? 'cheerful'] ?? PHASES.cheerful!;
  const list = bank[lang] ?? bank.yue;
  return list[phase % list.length]!;
}
