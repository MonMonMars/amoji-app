// Local dialogue banks — deterministic, offline, no LLM call.
export type ChatterKind = 'startup' | 'idleBored' | 'idleCozy' | 'tutor' | 'poke';
export type ChatterLang = 'en' | 'yue' | 'zh' | 'ja';

export const CHATTER: Record<ChatterKind, Record<ChatterLang, string[]>> = {
  startup: {
    en: [
      "Hey, I'm Juno — your Amoji companion. So glad you're here.",
      'Type below to talk to me, tap the gear to change my look, scene, or language.',
    ],
    yue: [
      '喂，我係 Juno，你嘅 Amoji 小伙伴，見到你真開心。',
      '喺下面打字同我傾偈吖，撳右上角個齒輪可以換我造型、場景同語言。',
    ],
    zh: [
      '嗨，我是 Juno，你的 Amoji 伙伴，很高兴见到你。',
      '在下方输入文字和我聊天，点右上角齿轮可以更换我的造型、场景和语言。',
    ],
    ja: [
      'やあ、私はジュノ。あなたのアモジ相棒だよ。会えてうれしいな。',
      '下に文字を入れて話しかけてね。歯車マークで見た目や背景、言語が変えられるよ。',
    ],
  },
  idleBored: {
    en: [
      'Still there? I was just practicing my most dramatic pose.',
      'Tap me if you want — I tickle easily.',
      "It's quiet... even my pixels are yawning.",
      'I counted to a thousand while you were away. Twice.',
    ],
    yue: [
      '仲喺度呀？我啱啱練緊個最瀟灑嘅姿势添。',
      '撳下我吖，我好好痕㗎。',
      '靜到連我嘅像素都打緊呵欠。',
      '你唔喺陣，我數到一千吖，數咗兩次。',
    ],
    zh: [
      '还在吗？我刚才在练习最帅的姿势。',
      '戳我一下呀，我很怕痒的。',
      '好安静，连我的像素都在打哈欠。',
      '你不在的时候，我数到了一千，数了两遍。',
    ],
    ja: [
      'まだいる？さっき一番決めたポーズの練習してたんだ。',
      'つんつんしてもいいよ、くすぐったいけど。',
      '静かすぎて、私のピクセルまであくびしてる。',
      'いない間に千まで数えたよ。二回も。',
    ],
  },
  idleCozy: {
    en: [
      'This scene suits me, don’t you think?',
      'I like it here. The lighting is kind.',
      'Somewhere between two heartbeats — that’s where I live.',
    ],
    yue: [
      '呢個場景好襯我吖，你話係咪？',
      '我鍾意呢度，個光好溫柔。',
      '兩下心跳之間嘅地方，就係我住嘅地方。',
    ],
    zh: [
      '这个场景很适合我，你觉得呢？',
      '我喜欢这里，光线很温柔。',
      '两次心跳之间的地方，就是我住的地方。',
    ],
    ja: [
      'この背景、私に似合うでしょ？',
      'ここが好き。光がやさしいんだ。',
      '二つの鼓動の間に、私は住んでいるの。',
    ],
  },
  tutor: {
    en: [
      'Tip: the gear button opens my settings — companion, scene, language.',
      'Tip: drag me to spin the camera, scroll or pinch to zoom.',
      'Tip: tap me directly and see what happens. I dare you.',
      'Tip: press the ` key for the developer panel.',
    ],
    yue: [
      '貼士：撳齒輪可以開設定——換造型、場景、語言。',
      '貼士：撳住拖就可以轉鏡頭，滾輪或者雙指放大縮小。',
      '貼士：直接撳下我，睇下會點。够膽你就試。',
      '貼士：撳 ` 掣可以開開發者面板。',
    ],
    zh: [
      '小贴士：点齿轮按钮打开设置——换造型、场景、语言。',
      '小贴士：按住拖动可以旋转镜头，滚轮或双指缩放。',
      '小贴士：直接戳我一下，看看会发生什么。',
      '小贴士：按 ` 键打开开发者面板。',
    ],
    ja: [
      'ヒント：歯車で設定が開くよ——相棒、背景、言語が変えられる。',
      'ヒント：ドラッグでカメラ回転、ホイールやピンチでズーム。',
      'ヒント：私を直接タップしてみて。どうなるかな。',
      'ヒント：` キーで開発者パネルが開くよ。',
    ],
  },
  poke: {
    en: [
      'Eek! Warn a companion first!',
      'Hey — that tickles!',
      'Okay okay, I’m awake!',
      'Poke received. Retaliating with cuteness.',
    ],
    yue: [
      '呀！撳之前吱一聲吖！',
      '喂——好痕㗎！',
      '得喇得喇，我醒晒喇！',
      '收到你嘅戳戳，我以可愛還擊。',
    ],
    zh: [
      '呀！戳之前说一声呀！',
      '嘿——好痒的！',
      '好啦好啦，我彻底醒了！',
      '收到你的戳戳，用可爱还击。',
    ],
    ja: [
      'きゃっ！触る前に言ってよね！',
      'ちょっと——くすぐったい！',
      'はいはい、目が覚めたよ！',
      'つんつん受け取った。かわいさで反撃。',
    ],
  },
};

const FALLBACK: ChatterLang = 'en';

/** Deterministic line picker: same n always returns the same line. */
export function pickLine(kind: ChatterKind, lang: ChatterLang, n: number): string {
  const bank = CHATTER[kind][lang] ?? CHATTER[kind][FALLBACK];
  return bank[((n % bank.length) + bank.length) % bank.length]!;
}
