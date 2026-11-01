// Local dialogue banks — deterministic, offline, no LLM call.
// r2026-10-03.37: every line ends with a question or a recommendation so the
// conversation always has somewhere to go (Master Simon's continuity rule).
// r2026-10-03.38: reengage + reengageSoft banks — the staged "you've gone
// quiet" follow-ups (direct check-in) and the soft closer (said once).
// r2026-10-04.63: startup + tutor lines pointed at the top-RIGHT gear for
// character/scene/language changes — wrong button. Character switching is
// the top-LEFT name plate; the gear is settings. Reworded all languages.
export type ChatterKind = 'startup' | 'idleBored' | 'idleCozy' | 'tutor' | 'poke' | 'reengage' | 'reengageSoft';
export type ChatterLang = 'en' | 'yue' | 'zh' | 'ja';

export const CHATTER: Record<ChatterKind, Record<ChatterLang, string[]>> = {
  startup: {
    en: [
      "Hi, I'm {name}. I'm here if you want to talk.",
      'Type below, or tap the mic, and tell me what you want to chat about.',
    ],
    yue: [
      '你好，我係{name}。想傾偈嘅話，我喺度。',
      '喺下面打字，或者撳個咪，同我講你想傾咩呀？',
    ],
    zh: [
      '你好，我是{name}。想聊天的话，我在这里。',
      '在下面打字，或者点麦克风，告诉我你想聊什么呀？',
    ],
    ja: [
      'こんにちは、{name}です。話したかったら、ここにいるよ。',
      '下に書くか、マイクを押して、何を話したい？',
    ],
  },
  idleBored: {
    en: [
      'Still here with you in this quiet stretch.',
      'A soft tap lands fine — I tickle easily.',
      'The quiet is thick; I am inventing gentle noise in my head.',
      'I counted to a thousand while you were away — practicing patience.',
    ],
    yue: [
      '呢段靜我仲陪住你。',
      '輕輕撳一下都得——我好好痕。',
      '靜得好厚；我喺腦入面發明柔聲。',
      '你唔喺陣我數到一千——練習耐心。',
    ],
    zh: [
      '这段安静里我还陪着你。',
      '轻轻戳一下也行——我很怕痒。',
      '静得好厚；我在脑子里发明柔声。',
      '你不在的时候我数到了一千——练习耐心。',
    ],
    ja: [
      'この静けさのあいだも、ここにいるよ。',
      'やさしくつついても大丈夫——くすぐったいけど。',
      '静かが濃いね。頭の中でやさしい音を作ってる。',
      'いない間に千まで数えたよ——忍耐の練習。',
    ],
  },
  idleCozy: {
    en: [
      'This scene suits me — I am settling into it.',
      'I like it here; home-feeling is close.',
      'Somewhere between two heartbeats — soft and steady.',
    ],
    yue: [
      '呢個場景好襯我——我慢慢坐低。',
      '我鍾意呢度；家嘅感覺好近。',
      '兩下心跳之間——柔同穩。',
    ],
    zh: [
      '这个场景很适合我——我慢慢坐下。',
      '我喜欢这里；家的感觉很近。',
      '两次心跳之间——柔和稳。',
    ],
    ja: [
      'この背景、私に似合う——ゆっくり落ち着いてる。',
      'ここが好き。ホームの感覚が近い。',
      '二つの鼓動の間——やわらかく、安定。',
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
  // r2026-10-03.38 — stage 1 of re-engagement: the USER (not just the room)
  // has been quiet for ~2 minutes, so she leans in directly.
  reengage: {
    en: [
      "You've gone quiet on me — are you thinking, or did I say something wrong?",
      "It's been a minute... want to pick up where we left off?",
      'Hey~ I was really enjoying our chat — want to keep going?',
      "Penny for your thoughts — what's going on in that head of yours?",
    ],
    yue: [
      '你靜咗喎——係咪諗緊嘢，定係我講錯咗咩？',
      '好耐冇聲喎……我哋繼續之前個話題好唔好？',
      '喂~我仲想同你傾落去㗎——繼續好唔好？',
      '講嚟聽下吖——你個腦而家轉緊咩呀？',
    ],
    zh: [
      '你安静下来了——是在想事情，还是我说错什么了？',
      '好一会儿没声音了……我们继续刚才的话题好不好？',
      '喂~我还想和你聊下去呢——继续好不好？',
      '说来听听嘛——你的脑子里现在转着什么呢？',
    ],
    ja: [
      '静かになっちゃった——考え事？それとも何か失言しちゃった？',
      'しばらく無音だね……さっきの話、続きをしよっか？',
      'ねぇ、もっとおしゃべりしたいな——続き、しよっか？',
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
