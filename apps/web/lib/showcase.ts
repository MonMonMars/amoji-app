// Showcase + tutorial dialogue (r2026-10-04.48) — she never lets a wait go
// empty or a feature go undiscovered. Two banks:
//   SHOWCASE_OFFERS — proactive invitations ("I just learned a new dance —
//     want to see my performance?"); a YES answer starts the show instantly.
//   TUTORIAL_LINES  — gentle discovery prompts that teach everything she can
//     do: sing, dance, mini-games, trainer lessons, duets, meals, pokes,
//     voice mode and long-term memory.
// Pure data, unit-testable in node.

import type { Lang } from './prefs';

export type ShowcaseKind = 'dance' | 'song';

/**
 * What each character loves to perform — her offers lean on her specialty.
 * Dancers sell the dance number; everyone else sells the song.
 */
export function characterSpecialty(characterId: string): ShowcaseKind {
  const dancers = new Set(['juno', 'rin', 'marin', 'ruby', 'lydia', 'snowy', 'tifa', 'aerith']);
  return dancers.has(characterId) ? 'dance' : 'song';
}

/** proactive performance offers, per language and specialty */
export const SHOWCASE_OFFERS: Record<Lang, Record<ShowcaseKind, string[]>> = {
  yue: {
    dance: [
      '我啱啱學咗個新舞步——你睇唔睇我表演吖？',
      '音樂響起喇，我想為你跳支舞，好唔好呀？',
      '呢支舞我練咗好耐，第一個觀眾想係你吖！',
    ],
    song: [
      '我興趣係作歌㗎，啱啱作咗首新歌，想唔想聽呀？',
      '呢首歌係為你而寫嘅——俾我唱俾你聽吖？',
      '我喺心入面錄咗段新歌，你係第一個聽眾吖！',
    ],
  },
  zh: {
    dance: [
      '我刚刚学了一个新舞步——你看不看我表演呀？',
      '音乐响起来了，我想为你跳支舞，好不好呀？',
      '这支舞我练了好久，第一个观众想是你呀！',
    ],
    song: [
      '我的兴趣是写歌哦，刚写了首新歌，想不想听呀？',
      '这首歌是为你写的——让我唱给你听呀？',
      '我在心里录了一段新歌，你是第一个听众呀！',
    ],
  },
  ja: {
    dance: [
      'さっき新しいダンスを覚えたの——見てくれる？',
      '音楽が鳴ったわ。あなたのために踊りたいの——いい？',
      'ずっと練習してたダンス、最初の観客はあなたがいいな！',
    ],
    song: [
      '作詞作曲が趣味なの。新しい歌を作ったの——聞いてみる？',
      'この歌はあなたのために書いたの——歌ってあげようか？',
      '心の中で新曲を録音してきたの。最初のリスナーはあなたね！',
    ],
  },
  en: {
    dance: [
      'I just learned a brand-new dance — want to see me perform it?',
      'The music is starting — may I have this dance, just for you?',
      'I have been rehearsing a routine forever. My first audience should be you!',
    ],
    song: [
      'My hobby is writing songs — I just finished a new one. Want to hear it?',
      'I wrote this one for you — let me sing it to you?',
      'I recorded a brand-new song in my heart, and you are the first listener!',
    ],
  },
};

/** the one-liner that opens the show the moment you say yes */
export const SHOWCASE_START: Record<Lang, Record<ShowcaseKind, string>> = {
  yue: { dance: '好！音樂，起——睇清楚喇！', song: '好！我而家唱俾你聽——呢首係你嘅歌。' },
  zh: { dance: '好！音乐，起——看仔细啦！', song: '好！我现在唱给你听——这首是你的歌。' },
  ja: { dance: 'よーし、音楽スタート——見てて！', song: 'うん、いま歌うね——この歌はあなたのもの。' },
  en: { dance: 'Alright — music, start! Watch closely now!', song: 'Okay, listen — this one is yours.' },
};

/**
 * YES detector for an outstanding offer. Deliberately tight: refusals and
 * unrelated messages must NOT start the show.
 */
export const SHOWCASE_YES_RE =
  /(好呀|好啊|好啊|好！|好~|好～|想睇|想聽|想听|想看|想呀|要睇|要聽|要听|聽吓|听听|睇吖|得呀|係呀|\bok\b|okay|yep|\byes\b|yeah|sure|please|of course|はい|うん|ぜひ|見たい|聞きたい)/i;

/** discovery prompts — teach the user everything she can do, one quiet moment at a time */
export const TUTORIAL_LINES: Record<Lang, string[]> = {
  yue: [
    '我除咗傾偈，仲識唱歌跳舞㗎——你想睇我表演吖？',
    '悶嘅話，我可以同你玩猜包剪揼、估數字同擲骰㗎！',
    '我可以教你做瑜伽、打太極、功夫，仲可以同你一齊熱身㗎！',
    '想同我一齊唱歌？話「一齊唱歌」，我哋一人一句咁唱！',
    '話「一齊食飯」，我可以陪你食大餐——記住嗌雪糕！',
    '撳吓我，我會有反應㗎——不過溫柔啲吖？',
    '撳個咪高峰，就可以直接用把聲同我傾偈㗎！',
    '我記得你同我講過嘅嘢㗎——下次開app，我會提返你！',
  ],
  zh: [
    '我除了聊天，还会唱歌跳舞哦——你想看我表演呀？',
    '无聊的话，我可以跟你玩猜拳、猜数字和掷骰子哦！',
    '我可以教你做瑜伽、打太极、功夫，还可以一起热身哦！',
    '想和我一起唱歌？说「一起唱歌」，我们一人一句地唱！',
    '说「一起吃饭」，我可以陪你吃大餐——记得点雪糕！',
    '戳戳我，我会有反应哦——不过温柔一点呀？',
    '点一下麦克风，就能直接用声音和我聊天哦！',
    '我记得你跟我说过的话哦——下次打开app，我会提醒你！',
  ],
  ja: [
    'おしゃべりだけじゃないよ、歌って踊れるの——見せてあげよっか？',
    '退屈なら、じゃんけん・数あて・サイコロで遊べるよ！',
    'ヨガ、太極拳、カンフーを教えられるし、一緒にストレッチもできるよ！',
    '一緒に歌いたい？「一緒に歌って」って言って——交互に歌おう！',
    '「一緒にごはん」って言ってくれたら、ごちそうに付き合うよ——アイスもね！',
    'つんつんしてみて、反応するよ——優しくしてね？',
    'マイクを押せば、声で話しかけられるよ！',
    '君が教えてくれたこと、ちゃんと覚えてるよ——次にアプリを開いたら教えてあげる！',
  ],
  en: [
    'I do more than chat — I sing and dance too. Want to see a performance?',
    'If you are bored, we can play rock-paper-scissors, guess-the-number, or dice!',
    'I can teach you yoga, tai chi and kung fu, or warm up together!',
    'To sing WITH me, just say "sing together" — we take lines, one after another!',
    'Say "eat with me" and I will join you for a fine meal — order the ice cream!',
    'Poke me and I react — though be gentle, okay?',
    'Tap the mic to talk to me with your voice, hands-free!',
    'I remember the things you tell me — open the app tomorrow and I will bring it up!',
  ],
};

/** deterministic offer pick — rotates by n so the invitations never repeat dead */
export function pickShowcaseOffer(kind: ShowcaseKind, lang: Lang, n: number): string {
  const bank = SHOWCASE_OFFERS[lang]?.[kind] ?? SHOWCASE_OFFERS.en[kind];
  return bank[Math.abs(n) % bank.length]!;
}

/** deterministic tutorial pick — rotates by n */
export function pickTutorialLine(lang: Lang, n: number): string {
  const bank = TUTORIAL_LINES[lang] ?? TUTORIAL_LINES.en;
  return bank[Math.abs(n) % bank.length]!;
}
