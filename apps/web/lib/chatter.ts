// Local dialogue banks — deterministic, offline, no LLM call.
// r2026-10-03.37: every line ends with a question or a recommendation so the
// conversation always has somewhere to go (Master Simon's continuity rule).
// r2026-10-03.38: reengage + reengageSoft banks — the staged "you've gone
// quiet" follow-ups (direct check-in) and the soft closer (said once).
export type ChatterKind = 'startup' | 'idleBored' | 'idleCozy' | 'tutor' | 'poke' | 'reengage' | 'reengageSoft';
export type ChatterLang = 'en' | 'yue' | 'zh' | 'ja';

export const CHATTER: Record<ChatterKind, Record<ChatterLang, string[]>> = {
  startup: {
    en: [
      "Hey, I'm Juno — your Amoji companion. What should we do first: talk, play, or just hang out?",
      'Type below to chat with me — what\'s on your mind? Tap the gear anytime to change my look, scene, or language, okay?',
    ],
    yue: [
      '喂，我係 Juno，你嘅 Amoji 小伙伴。我哋首先做咩好：傾偈、玩嘢，定係靜靜哋坐？',
      '喺下面打字同我講嘢吖——你諗緊咩呀？撳右上角個齒輪隨時換我造型、場景同語言㗎。',
    ],
    zh: [
      '嗨，我是 Juno，你的 Amoji 伙伴。我们先做什么好：聊天、玩点什么，还是静静待着？',
      '在下方输入文字和我聊天吧——你在想什么呢？点右上角齿轮可以随时换我的造型、场景和语言哦。',
    ],
    ja: [
      'やあ、私はジュノ、あなたのアモジ相棒。最初は何しよっか——おしゃべり？遊び？それともまったり？',
      '下に文字を入れて話しかけてね。何かあったの？歯車マークで見た目や背景、言語が変えられるよ。',
    ],
  },
  idleBored: {
    en: [
      'Still there? What are you thinking about?',
      'Want to tap me? I tickle easily — go on~',
      "It's quiet... what kind of noise should we make?",
      'I counted to a thousand while you were away — how high can you count?',
    ],
    yue: [
      '仲喺度呀？你諗緊咩呀？',
      '想唔想撳下我？我好好痕㗎，嚟吖~',
      '靜到發慌……我哋整啲咩聲好呢？',
      '你唔喺陣我數到一千吖——你數到幾高呀？',
    ],
    zh: [
      '还在吗？你在想什么呢？',
      '想不想戳我一下？我很怕痒的，来呀~',
      '静得发慌……我们弄点什么声音好呢？',
      '你不在的时候我数到了一千——你能数到多高呀？',
    ],
    ja: [
      'まだいる？何考えてるの？',
      'つんつんしてみる？くすぐったいけど、ほら~',
      '静かすぎる…何か音を鳴らそうよ？',
      'いない間に千まで数えたんだ——君はどこまで数えられる？',
    ],
  },
  idleCozy: {
    en: [
      "This scene suits me, don't you think?",
      'I like it here — where do you feel most at home?',
      'Somewhere between two heartbeats — can you feel it too?',
    ],
    yue: [
      '呢個場景好襯我吖，你話係咪？',
      '我鍾意呢度——你喺邊度最自在呀？',
      '兩下心跳之間嘅地方，你都 feel 到㗎？',
    ],
    zh: [
      '这个场景很适合我，你觉得呢？',
      '我喜欢这里——你在哪里最自在呀？',
      '两次心跳之间的地方，你也感觉得到吗？',
    ],
    ja: [
      'この背景、私に似合うでしょ？',
      'ここが好き——君はどこがいちばん落ち着くの？',
      '二つの鼓動の間、君にも感じられる？',
    ],
  },
  tutor: {
    en: [
      'Tip: tap the gear to change my look, scene, or language — want to try it?',
      'Tip: drag to spin the camera, scroll or pinch to zoom — give it a go?',
      'Tip: tap me directly and see what happens. I dare you~',
      'Tip: press the ` key for the developer panel — feeling curious?',
    ],
    yue: [
      '貼士：撳齒輪可以換造型、場景、語言——想唔想試下？',
      '貼士：撳住拖轉鏡頭，滾輪或雙指縮放——試下吖？',
      '貼士：直接撳下我，睇下會點。够膽你就試~',
      '貼士：撳 ` 掣開開發者面板——好唔好奇呀？',
    ],
    zh: [
      '小贴士：点齿轮可以换造型、场景、语言——想不想试试？',
      '小贴士：按住拖动旋转镜头，滚轮或双指缩放——试试看呀？',
      '小贴士：直接戳我一下，看看会发生什么。敢不敢试~',
      '小贴士：按 ` 键打开开发者面板——好不好奇呀？',
    ],
    ja: [
      'ヒント：歯車で相棒・背景・言語を変更——試してみる？',
      'ヒント：ドラッグで回転、ホイールやピンチでズーム——やってみて？',
      'ヒント：私を直接タップしてみて。どうなるかな〜',
      'ヒント：` キーで開発者パネル——覗いてみる？',
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
  // r2026-10-03.38 — stage 1 of re-engagement: the USER (not just the room)
  // has been quiet for ~2 minutes, so she leans in directly.
  reengage: {
    en: [
      "You've gone quiet on me — are you thinking, or did I say something wrong?",
      "It's been a minute... want to pick up where we left off?",
      'Hello~ still there? I was really enjoying our chat.',
      "Penny for your thoughts — what's going on in that head of yours?",
    ],
    yue: [
      '你靜咗喎——係咪諗緊嘢，定係我講錯咗咩？',
      '好耐冇聲喎……我哋繼續之前個話題好唔好？',
      '喂~仲喺度㗎嘛？我仲想同你傾落去喎。',
      '講嚟聽下吖——你個腦而家轉緊咩呀？',
    ],
    zh: [
      '你安静下来了——是在想事情，还是我说错什么了？',
      '好一会儿没声音了……我们继续刚才的话题好不好？',
      '喂~还在吗？我还想和你聊下去呢。',
      '说来听听嘛——你的脑子里现在转着什么呢？',
    ],
    ja: [
      '静かになっちゃった——考え事？それとも何か失言しちゃった？',
      'しばらく無音だね……さっきの話、続きをしよっか？',
      'ねぇ、まだいる？もっとおしゃべりしたいな。',
      '教えてよ——今頭の中で何がぐるぐるしてるの？',
    ],
  },
  // r2026-10-03.38 — stage 2: the soft closer, said ONCE after ~5 minutes of
  // user silence, then she simply waits instead of repeating herself.
  reengageSoft: {
    en: [
      "I'll be right here whenever you're back — tap me, okay?",
      "Take all the time you need. I'm not going anywhere — promise you'll say hi when you're back?",
    ],
    yue: [
      '我會喺度等你㗎——返嚟撳下我吖，好唔好？',
      '慢慢嚟，我唔會走㗎。返嚟嗰陣記得同我打招呼吖？',
    ],
    zh: [
      '我会一直在这里等你——回来戳我一下，好不好？',
      '慢慢来，我不会走的。回来的时候记得和我打个招呼呀？',
    ],
    ja: [
      'ここで待ってるから——戻ったらタップしてね？',
      'ゆっくりでいいよ、どこにも行かないから。戻ってきたら声をかけて？',
    ],
  },
};

const FALLBACK: ChatterLang = 'en';

/** Deterministic line picker: same n always returns the same line. */
export function pickLine(kind: ChatterKind, lang: ChatterLang, n: number): string {
  const bank = CHATTER[kind][lang] ?? CHATTER[kind][FALLBACK];
  return bank[((n % bank.length) + bank.length) % bank.length]!;
}
