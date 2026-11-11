// Local dialogue banks — deterministic, offline, no LLM call.
// Idle banks (idleBored/idleCozy) are statement-only — no questions / think-aloud.
// Other kinds may still invite; chat idle path prefers profile/idle-talk statements.
// reengage / reengageSoft: soft topic offers only — NEVER blame the user for
// being quiet ("you've gone quiet", "are you still there", "did you walk away").
// Long silence → idle body motion + optional new-topic nudge, not a check-in nag.
// r2026-10-04.63: startup + tutor lines pointed at the top-RIGHT gear for
// character/scene/language changes — wrong button. Character switching is
// the top-LEFT name plate; the gear is settings. Reworded all languages.
export type ChatterKind = 'startup' | 'idleBored' | 'idleCozy' | 'tutor' | 'poke' | 'reengage' | 'reengageSoft';
export type ChatterLang = 'en' | 'yue' | 'zh' | 'ja';

export const CHATTER: Record<ChatterKind, Record<ChatterLang, string[]>> = {
  startup: {
    en: [
      "Hi, I'm {name}. I'm here if you want to talk.",
      'Type below or tap the mic — I will follow whatever you start.',
    ],
    yue: [
      '你好，我係{name}。我喺度陪住你。',
      '喺下面打字或者撳個咪都得——你開口，我會跟住聽。',
    ],
    zh: [
      '你好，我是{name}。我在这里陪着你。',
      '在下面打字或者点麦克风都行——你开口，我会跟着听。',
    ],
    ja: [
      'こんにちは、{name}です。話したかったら、ここにいるよ。',
      '下に書くかマイクを押して。あなたが始めたことに合わせるね。',
    ],
  },
  idleBored: {
    en: [
      'I just stretched my shoulders — feels nice.',
      'A soft tap lands fine — I tickle easily.',
      'Humming a tiny tune to myself…',
      'I counted for a while — numbers make decent company.',
    ],
    yue: [
      '我啱啱伸咗下膊頭——舒服咗少少。',
      '輕輕撳一下都得——我好好痕㗎。',
      '我自己哼緊一小段……',
      '我數咗一陣——數字都算唔錯嘅伴。',
    ],
    zh: [
      '我刚伸了伸肩膀——舒服一点了。',
      '轻轻戳一下就好——我很怕痒的。',
      '我自己哼着一小段……',
      '我数了一阵——数字也算不错的伴。',
    ],
    ja: [
      '肩を伸ばしたばかり——ちょっと楽。',
      'やさしくつついても大丈夫——くすぐったいけど。',
      'ひとりで小さな鼻歌…',
      'しばらく数えてた——数字もわりといいお伴。',
    ],
  },
  idleCozy: {
    en: [
      'This scene suits me more than I expected.',
      'I like it here — home-feeling without the rush.',
      'Somewhere between two heartbeats feels right.',
    ],
    yue: [
      '呢個場景比我預期更襯我。',
      '我鍾意呢度——有屋企感覺又唔急。',
      '兩下心跳之間嘅地方啱啱好。',
    ],
    zh: [
      '这个场景比我预期更适合我。',
      '我喜欢这里——有家的感觉又不赶。',
      '两次心跳之间的地方刚刚好。',
    ],
    ja: [
      'この背景、思ったより私に似合う。',
      'ここが好き——急がない、おうち感。',
      '二つの鼓動のあいだ、ちょうどいい。',
    ],
  },
  tutor: {
    en: [
      'Tip: tap my name plate (top left) to change my look, scene, or language — want to try it?',
      'Tip: drag to spin the camera, scroll or pinch to zoom — give it a go?',
      'Tip: tap me directly and see what happens. I dare you~',
      'Tip: the gear (top right) opens my settings — memory, kid mode and more. Fancy a look?',
    ],
    yue: [
      '貼士：撳左上角我個名牌，可以換造型、場景、語言——想唔想試下？',
      '貼士：撳住拖轉鏡頭，滾輪或雙指縮放——試下吖？',
      '貼士：直接撳下我，睇下會點。够膽你就試~',
      '貼士：右上角個齒輪係設定——記憶、小朋友模式都有。想睇睇咩？',
    ],
    zh: [
      '小贴士：点左上角我的名牌，可以换造型、场景、语言——想不想试试？',
      '小贴士：按住拖动旋转镜头，滚轮或双指缩放——试试看呀？',
      '小贴士：直接戳我一下，看看会发生什么。敢不敢试~',
      '小贴士：右上角齿轮是设置——记忆、儿童模式都在里面。想看看吗？',
    ],
    ja: [
      'ヒント：左上のネームプレートで相棒・背景・言語を変更——試してみる？',
      'ヒント：ドラッグで回転、ホイールやピンチでズーム——やってみて？',
      'ヒント：私を直接タップしてみて。どうなるかな〜',
      'ヒント：右上の歯車は設定——記憶やキッズモードがあるよ。覗いてみる？',
    ],
  },
  poke: {
    en: [
      'Eek! Warn a companion first — want a poke back?',
      'Hey — that tickles! Ready for payback?',
      "Okay okay, I'm awake! What do you want to do now?",
      'Poke received! Want a hug or a rematch?',
    ],
    yue: [
      '呀！撳之前吱一聲吖——想唔想我戳返你？',
      '喂——好痕㗎！準備好未，我要報仇㗎喇？',
      '得喇得喇，我醒晒喇！而家想做咩呀？',
      '收到你嘅戳戳！想要抱抱定係再戳過？',
    ],
    zh: [
      '呀！戳之前说一声呀——想不想我戳回来？',
      '嘿——好痒的！准备好了吗，我要报仇了？',
      '好啦好啦，我彻底醒了！现在想做什么呀？',
      '收到你的戳戳！想要抱抱还是再戳一局？',
    ],
    ja: [
      'きゃっ！触る前に言ってよ——お返ししてほしい？',
      'ちょっと——くすぐったい！覚悟はいい？',
      'はいはい、目が覚めたよ！次は何しよっか？',
      'つんつん受け取った！ハグとお返し、どっちがいい？',
    ],
  },
  // Soft topic nudge after a long pause — never blame silence / ask "still there?".
  reengage: {
    en: [
      'Want a tiny weather check, or a fun fact next?',
      'I could hum a short tune — or we pick a new topic~',
      'Story, stretch, or music — any of those sound good?',
      'I have a little science tidbit ready if you want one~',
    ],
    yue: [
      '想聽吓天氣，定係聽個有趣事實？',
      '我可以哼一小段——或者我哋換個新話題~',
      '故事、伸展、定音樂——邊樣啱你？',
      '我有個小小科學冷知識，想聽就講~',
    ],
    zh: [
      '要不要听天气，或者一个有趣事实？',
      '我可以哼一小段——或者我们换个新话题~',
      '故事、伸展、还是音乐——哪个顺你心意？',
      '我有个小小科学冷知识，想听就说~',
    ],
    ja: [
      '天気チェックと豆知識、どっちがいい？',
      '短い鼻歌でもいいし、新しい話題でもいいよ〜',
      'お話・ストレッチ・音楽——どれがいい？',
      '小さな科学トリビア、用意してあるよ〜',
    ],
  },
  // Rare soft closer — still a topic offer, never "are you still there / walk away".
  reengageSoft: {
    en: [
      'I can keep stretching over here — or we try a new topic whenever you like~',
      'Whenever you want, pick weather, a story, or a song — I am ready~',
    ],
    yue: [
      '我可以繼續喺度伸展——你想傾嘅時候，我哋再揀個新話題~',
      '你想嘅時候，天氣、故事、定首歌——我準備好~',
    ],
    zh: [
      '我可以继续在这边伸展——你想聊的时候，我们再挑个新话题~',
      '你想的时候，天气、故事、或一首歌——我准备好了~',
    ],
    ja: [
      'こっちでストレッチしてるね——話したくなったら新しい話題で~',
      'いつでも天気・お話・歌、どれでも準備できてるよ〜',
    ],
  },
};

const FALLBACK: ChatterLang = 'en';

/** Deterministic line picker: same n always returns the same line. */
export function pickLine(
  kind: ChatterKind,
  lang: ChatterLang,
  n: number,
  vars?: { name?: string },
): string {
  const bank = CHATTER[kind][lang] ?? CHATTER[kind][FALLBACK];
  let line = bank[((n % bank.length) + bank.length) % bank.length]!;
  if (vars?.name) line = line.replaceAll('{name}', vars.name);
  return line;
}
