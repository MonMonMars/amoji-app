// Showcase + tutorial dialogue — she never lets a wait go empty or a feature
// go undiscovered. Ability reminders offer ONE skill at a time on long idle
// or when opening a new topic ("Want to hear some music?" / "Want to see me
// dance?"). A YES answer starts that skill instantly.
// Pure data, unit-testable in node.

import type { Lang } from './prefs';

export type ShowcaseKind = 'dance' | 'song' | 'music' | 'news' | 'weather' | 'story';

/**
 * Quiet-idle / new-topic ability reminders rotate through these — one offer
 * per quiet beat so newcomers learn what she can do without a feature dump.
 */
export const SKILL_OFFERS: readonly ShowcaseKind[] = [
  'music',
  'dance',
  'song',
  'weather',
  'story',
  'news',
];

export function skillOfferKind(n: number): ShowcaseKind {
  return SKILL_OFFERS[Math.abs(n) % SKILL_OFFERS.length]!;
}

/** Next ability offer; skips repeating the same kind back-to-back. */
export function nextSkillOffer(n: number, last?: ShowcaseKind | null): ShowcaseKind {
  const kind = skillOfferKind(n);
  if (last && kind === last && SKILL_OFFERS.length > 1) {
    return SKILL_OFFERS[(Math.abs(n) + 1) % SKILL_OFFERS.length]!;
  }
  return kind;
}

/**
 * What each character loves to perform — her offers lean on her specialty.
 * Dancers sell the dance number; everyone else sells the song.
 */
export function characterSpecialty(characterId: string): ShowcaseKind {
  const dancers = new Set(['juno', 'rin', 'marin', 'ruby', 'lydia', 'snowy', 'tifa', 'aerith']);
  return dancers.has(characterId) ? 'dance' : 'song';
}

/** Proactive one-ability invitations — short, clear, invite-style. */
export const SHOWCASE_OFFERS: Record<Lang, Record<ShowcaseKind, string[]>> = {
  yue: {
    dance: [
      '想唔想睇我跳支舞呀？',
      '音樂一嚟，我可以跳俾你睇——想睇嗎？',
      '我啱啱練咗個舞步，你睇唔睇吖？',
    ],
    song: [
      '想唔想聽我唱首歌呀？',
      '我啱啱作咗首新歌——想聽嗎？',
      '要不要我唱俾你聽吖？',
    ],
    music: [
      '想唔想聽吓音樂呀？',
      '我可以播段音樂俾你——想聽嗎？',
      '放啲輕鬆音樂好唔好？',
    ],
    news: [
      '想我讀一條輕鬆新聞俾你聽嗎？',
      '要不要我講一件今日嘅好消息呀？',
    ],
    weather: [
      '想我睇吓而家天氣再話你知嗎？',
      '要不要我報個天氣俾你呀？',
    ],
    story: [
      '想唔想聽我講個小故事呀？',
      '我可以講個溫馨小故事俾你——想聽嗎？',
      '要不要我講故仔俾你聽吖？',
    ],
  },
  zh: {
    dance: [
      '想不想看我跳支舞呀？',
      '音乐一起来，我可以跳给你看——想看吗？',
      '我刚练了一个舞步，你看不看呀？',
    ],
    song: [
      '想不想听我唱首歌呀？',
      '我刚写了首新歌——想听吗？',
      '要不要我唱给你听呀？',
    ],
    music: [
      '想不想听点音乐呀？',
      '我可以放段音乐给你——想听吗？',
      '放点轻松的音乐好不好？',
    ],
    news: [
      '想我读一条轻松新闻给你听吗？',
      '要不要我讲一件今天的好消息呀？',
    ],
    weather: [
      '想我看一下天气再告诉你吗？',
      '要不要我报个天气给你呀？',
    ],
    story: [
      '想不想听我讲个小故事呀？',
      '我可以讲个温馨小故事给你——想听吗？',
      '要不要我讲故事给你听呀？',
    ],
  },
  ja: {
    dance: [
      'ダンス、見てみる？',
      '音楽に合わせて踊ってあげるよ——見る？',
      '新しいステップ練習したの。見てくれる？',
    ],
    song: [
      '歌、聴いてみる？',
      '新しい曲つくったの——聴く？',
      '一曲うたってあげようか？',
    ],
    music: [
      '音楽、聴いてみる？',
      '軽い曲をかけるよ——いい？',
      'BGM流そうか？',
    ],
    news: [
      '軽いニュースを一つ読もうか？',
      '今日のいい話、聞いてみる？',
    ],
    weather: [
      '今の天気、見て伝えようか？',
      '天気チェックしようか？',
    ],
    story: [
      '小さな物語、聞いてみる？',
      '温かいお話、してあげようか？',
      '短いストーリー語ろうか？',
    ],
  },
  en: {
    dance: [
      'Want to see me dancing?',
      'I can put on a little dance for you — want to watch?',
      'I just rehearsed a new step. Want to see it?',
    ],
    song: [
      'Want me to sing a song for you?',
      'I just finished a new song — want to hear it?',
      'Shall I sing one for you?',
    ],
    music: [
      'Want to listen to some music?',
      'I can put some music on — want to hear it?',
      'Shall I play a light tune?',
    ],
    news: [
      'Want me to read one cheerful headline?',
      'Shall I share a bit of good news?',
    ],
    weather: [
      'Want me to check the weather for you?',
      'Shall I tell you what it is like outside?',
    ],
    story: [
      'Want me to tell you a little story?',
      'I can tell a short warm story — want to hear it?',
      'Shall I tell you a story?',
    ],
  },
};

/** the one-liner that opens the show the moment you say yes */
export const SHOWCASE_START: Record<Lang, Record<ShowcaseKind, string>> = {
  yue: {
    dance: '好！音樂，起——睇清楚喇！',
    song: '好！我而家唱俾你聽——呢首係你嘅歌。',
    music: '好！我播段音樂俾你。',
    news: '好！我讀一條新聞俾你聽。',
    weather: '好！我睇吓天氣話你知。',
    story: '好！我講個小故事俾你聽。',
  },
  zh: {
    dance: '好！音乐，起——看仔细啦！',
    song: '好！我现在唱给你听——这首是你的歌。',
    music: '好！我放段音乐给你。',
    news: '好！我读一条新闻给你听。',
    weather: '好！我看一下天气告诉你。',
    story: '好！我讲个小故事给你听。',
  },
  ja: {
    dance: 'よーし、音楽スタート——見てて！',
    song: 'うん、いま歌うね——この歌はあなたのもの。',
    music: 'うん、音楽をかけるね。',
    news: 'うん、ニュースを一つ読むね。',
    weather: 'うん、天気を見て伝えるね。',
    story: 'うん、小さな物語を話すね。',
  },
  en: {
    dance: 'Alright — music, start! Watch closely now!',
    song: 'Okay, listen — this one is yours.',
    music: 'Okay — here is some music.',
    news: 'Okay — one cheerful headline.',
    weather: 'Okay — I will check the weather.',
    story: 'Okay — here is a little story for you.',
  },
};

/** Canned ask used when the user accepts a story offer (feeds the chat brain). */
export function showcaseStoryAsk(lang: Lang): string {
  if (lang === 'ja') return '短いお話をして';
  if (lang === 'zh') return '讲个小故事给我听';
  if (lang === 'yue') return '講個小故事俾我聽';
  return 'tell me a little story';
}

/**
 * YES detector for an outstanding offer. Deliberately tight: refusals and
 * unrelated messages must NOT start the show.
 */
export const SHOWCASE_YES_RE =
  /(好呀|好啊|好！|好~|好～|想睇|想聽|想听|想看|想呀|要睇|要聽|要听|聽吓|听听|睇吖|得呀|係呀|\bok\b|okay|yep|\byes\b|yeah|sure|please|of course|はい|うん|ぜひ|見たい|聞きたい)/i;

/** discovery prompts — teach the user everything she can do, one quiet moment at a time */
export const TUTORIAL_LINES: Record<Lang, string[]> = {
  yue: [
    '我除咗傾偈，仲識唱歌跳舞㗎——你想睇我表演吖？',
    '想玩立體小遊戲？話「捕まえて」捉我，或者話「逃げて」玩三線躲避！',
    '我可以教你做瑜伽、打太極、功夫，仲可以同你一齊熱身㗎！',
    '想同我一齊唱歌？話「一齊唱歌」，我哋一人一句咁唱！',
    '話「一齊食飯」，我可以陪你食大餐——記住嗌雪糕！',
    '撳吓我，我會有反應㗎——不過溫柔啲吖？',
    '撳個咪高峰，就可以直接用把聲同我傾偈㗎！',
    '我記得你同我講過嘅嘢㗎——下次開app，我會提返你！',
  ],
  zh: [
    '我除了聊天，还会唱歌跳舞哦——你想看我表演呀？',
    '想玩立体小游戏？说「捕まえて」来抓我，或者说「逃げて」玩三线躲避！',
    '我可以教你做瑜伽、打太极、功夫，还可以一起热身哦！',
    '想和我一起唱歌？说「一起唱歌」，我们一人一句地唱！',
    '说「一起吃饭」，我可以陪你吃大餐——记得点雪糕！',
    '戳戳我，我会有反应哦——不过温柔一点呀？',
    '点一下麦克风，就能直接用声音和我聊天哦！',
    '我记得你跟我说过的话哦——下次打开app，我会提醒你！',
  ],
  ja: [
    'おしゃべりだけじゃないよ、歌って踊れるの——見せてあげよっか？',
    '立体ミニゲームもあるよ。「捕まえて」で鬼ごっこ、「逃げて」で3レーン回避！やってみる？',
    'ヨガ、太極拳、カンフーを教えられるし、一緒にストレッチもできるよ！',
    '一緒に歌いたい？「一緒に歌って」って言って——交互に歌おう！',
    '「一緒にごはん」って言ってくれたら、ごちそうに付き合うよ——アイスもね！',
    'つんつんしてみて、反応するよ——優しくしてね？',
    'マイクを押せば、声で話しかけられるよ！',
    '君が教えてくれたこと、ちゃんと覚えてるよ——次にアプリを開いたら教えてあげる！',
  ],
  en: [
    'I do more than chat — I sing and dance too. Want to see a performance?',
    'If you are bored, we can play mini-games — say 「捕まえて」 to play tag, or 「逃げて」 for lane dodge!',
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
