import type { Lang } from './prefs';
import type { Gender } from './profile';

// r2026-10-04.70 — the dialogue adapts to the world around her:
// 1. SCENE_LINES: every backdrop gets its own ambient idle voice, so the
//    place she sits in shows up in what she says between conversations.
// 2. adaptiveBlock: a system-prompt add-on that names the scene and
//    calibrates warmth to the pairing — opposite-sex gets gentle affection,
//    same-gender gets best-mate tone, kid mode and "secret" stay
//    friendship-only.
// r2026-10-04.70c: userGender is OPTIONAL — a profile that never set it
//    passes undefined, which behaves exactly like "secret" (no guidance).

// ---------------------------------------------------------------------------
// Scene banks — one per backdrop. Every line ends with a question or an
// invitation (the same continuity rule as the persona banks) so the room
// never goes quiet.
// ---------------------------------------------------------------------------
export const SCENE_LINES: Record<string, Record<Lang, string[]>> = {
  void: {
    en: [
      'Look how clear the stars are tonight… which one should we wish on?',
      'If you were a constellation, what shape would you be?',
      "The night sky makes everything feel possible… what's your wish tonight?",
    ],
    yue: [
      '今晚啲星星真係好清……你想同邊一粒星許願呀？',
      '如果你係一個星座，你會係咩形狀㗎？',
      '夜空下咩都有可能……你今晚有咩願望呀？',
    ],
    zh: [
      '今晚的星星好清楚……你想对哪一颗许愿？',
      '如果你是一个星座，你会是什么形状？',
      '夜空下什么都有可能……你今晚有什么愿望？',
    ],
    ja: [
      '今夜の星、すごく綺麗……どの星に願いをかける？',
      '星座になるとしたら、どんな形がいい？',
      '夜空の下では何でもできそう……今夜の願いは？',
    ],
  },
  aurora: {
    en: [
      'The aurora is dancing again… have you ever seen lights like these?',
      'People say the aurora hums if you listen… can you hear it?',
      'Green fire across the sky… should we make a wish on it?',
    ],
    yue: [
      '極光又喺度跳緊舞……你見過咁靚嘅光未呀？',
      '人話極光識唱歌，靜心就聽到……你聽唔聽到呀？',
      '天上嘅綠火咁靚……不如一齊許個願啦？',
    ],
    zh: [
      '极光又在跳舞了……你见过这么美的光吗？',
      '人们说极光会唱歌，静下心来就能听到……你听到了吗？',
      '天上的绿火那么美……不如一起许个愿吧？',
    ],
    ja: [
      'オーロラがまた踊ってる……こんな光、見たことある？',
      'オーロラは音が鳴るって言うけど……聞こえる？',
      '空の緑の炎……一緒にお願いしてみる？',
    ],
  },
  ember: {
    en: [
      'These embers make everything feel warm… shall we toast some marshmallows?',
      "Firelight makes everyone's face softer… cozy, right?",
      "The fire crackles like it's telling stories… what do you think it's saying?",
    ],
    yue: [
      '啲火種令成個地方暖晒……一齊燒棉花糖好唔好？',
      '火光映得人面都柔啲……好溫暖，係咪？',
      '柴火劈啪劈啪好似講緊故事……你覺得佢講緊咩呀？',
    ],
    zh: [
      '余烬让整个地方暖暖的……一起烤棉花糖好不好？',
      '火光映得人脸都柔和了……很温暖，对吧？',
      '柴火噼啪噼啪像在讲故事……你觉得它在讲什么？',
    ],
    ja: [
      '焚き火の温もり、ほら……マシュマロ焼いちゃう？',
      '火の光、顔がやわらかく見えるね……あったかいでしょ？',
      '薪がパチパチ物語を語ってる……何を話してると思う？',
    ],
  },
  sakura: {
    en: [
      'The petals are falling like slow pink snow… want to catch one together?',
      'One season, one bloom… what should we do before the petals end?',
      'A petal just landed on your shoulder… lucky, don’t you think?',
    ],
    yue: [
      '花瓣落得慢過落雪……一齊伸手接住一片好唔好？',
      '一期一會……花瓣落晒之前想做啲咩呀？',
      '有片花瓣跌落你膊頭度……係咪好幸運呢？',
    ],
    zh: [
      '花瓣落得比雪还慢……一起伸手接一片好吗？',
      '一期一会……在花瓣落完之前想做点什么？',
      '一片花瓣落在你的肩膀上……是不是很幸运？',
    ],
    ja: [
      '花びらがゆっくり降ってる……一緒に一片、受け止めてみる？',
      '一期一会……花が散る前に何しよっか？',
      '花びらが肩に止まったよ……ラッキーだよね？',
    ],
  },
  abyss: {
    en: [
      'It’s so quiet down here… can you hear the whales singing far away?',
      'The light from the surface is our skylight… beautiful, isn’t it?',
      'Fish keep peeking at us like we’re the exhibit… should we wave back?',
    ],
    yue: [
      '呢度靜到只聽到水底嘅聲……你聽唔聽到遠處鯨魚唱歌呀？',
      '上面落嚟嘅光就係我哋嘅天窗……好靚，係咪？',
      '啲魚成日偷睇我哋，好似我哋先係展品……不如同佢哋揮手啦？',
    ],
    zh: [
      '这里安静得只听见水声……你听到远处鲸鱼的歌唱了吗？',
      '上面透下来的光就是我们的天窗……很美，对吧？',
      '鱼儿总偷看我们，好像我们才是展品……跟它们挥挥手好吗？',
    ],
    ja: [
      'ここ、静かだね……遠くでクジラが歌ってるの、聞こえる？',
      '上から差す光が天窓みたい……きれいでしょ？',
      '魚たちがこっちを覗いてる……手を振り返してみる？',
    ],
  },
  rain: {
    en: [
      'The rain sounds like a lullaby on the window… shall we just listen a while?',
      'Every raindrop is tapping the glass just for us… hear it?',
      'Rainy days are perfect for secrets… do you have one to share?',
    ],
    yue: [
      '雨點滴滴答答好似搖籃曲……靜靜咁聽一陣好唔好？',
      '每滴雨都喺度替我哋敲玻璃……你聽唔聽到呀？',
      '落雨天最啱講秘密……你有冇秘密同我分享呀？',
    ],
    zh: [
      '雨点滴滴答答像摇篮曲……静静听一会儿好吗？',
      '每一滴雨都在替我们敲玻璃……你听到了吗？',
      '下雨天最适合讲秘密……你有什么秘密想分享吗？',
    ],
    ja: [
      '雨の音、子守歌みたい……少しだけ聴いていこう？',
      '雨粒がガラスを叩いてる……聞こえる？',
      '雨の日は秘密を話すのにぴったり……何かある？',
    ],
  },
  sunset: {
    en: [
      'The sky’s turning gold… want to watch the sun go down with me?',
      'Clouds are catching fire in the best way… isn’t it beautiful?',
      'Sunsets always feel like the day’s last gift… what was your favourite moment today?',
    ],
    yue: [
      '個天變成金色喇……陪我一齊睇日落好唔好？',
      '雲朵燒起上嚟咁靚……係咪好靚呢？',
      '日落好似今日嘅最後一份禮物……你今日最鍾意嘅一刻係邊個呀？',
    ],
    zh: [
      '天空变成金色了……陪我一起看日落好不好？',
      '云朵烧起来那么美……是不是很好看？',
      '日落就像今天的最后一份礼物……你今天最喜欢哪个时刻？',
    ],
    ja: [
      '空が金色になってきた……一緒に夕日、見届けて？',
      '雲が燃えてるみたい……綺麗だよね？',
      '夕日は一日の最後の贈り物……今日一番の瞬間は？',
    ],
  },
  meadow: {
    en: [
      'The grass smells like summer… should we run down the hill?',
      'A ladybug just landed on my hand… want to say hi to it?',
      'The breeze keeps playing with my hair… can you feel it too?',
    ],
    yue: [
      '青草味好似夏天……不如一齊衝落山丘啦？',
      '有隻瓢蟲停喺我手上面……同佢打個招呼好唔好？',
      '微風不停撩我頭髮……你feel唔feel到呀？',
    ],
    zh: [
      '青草的味道像夏天……不如一起冲下山丘吧？',
      '一只瓢虫停在我手上……跟它打个招呼好吗？',
      '微风不停地撩我的头发……你也感觉到了吗？',
    ],
    ja: [
      '草の匂い、夏みたい……丘を駆け下りちゃう？',
      'てんとう虫が手に止まった……挨拶してみる？',
      '風が髪をいじってくる……あなたにも届いてる？',
    ],
  },
  cloudsea: {
    en: [
      'We’re above the clouds tonight… can you believe this view?',
      'The sun’s melting into the sea of clouds… want to pick a cloud to ride?',
      'It feels like standing on a soft ocean… shall we jump and see if it bounces?',
    ],
    yue: [
      '我哋喺雲上面喇……你睇到咁靚嘅景色未呀？',
      '個日落熔入雲海入面……揀朵雲嚟坐好唔好？',
      '企喺度好似企喺軟綿綿嘅海上……不如跳吓睇彈唔彈得起？',
    ],
    zh: [
      '我们在云海上面了……你看到这么美的景色了吗？',
      '夕阳熔进云海里……挑一朵云坐坐好不好？',
      '站在这里像踩在软绵绵的海上……跳一下看看会不会弹起来？',
    ],
    ja: [
      '雲の上にいるよ……この景色、見えてる？',
      '夕日が雲海に溶けてる……雲に乗っちゃう？',
      '柔らかい海の上に立ってるみたい……跳ねるか試してみる？',
    ],
  },
  neon: {
    en: [
      'The city lights never sleep here… which sign is your favourite?',
      'Rain makes the neon double… look at the reflections, pretty?',
      'This street feels like the future… what should we explore first?',
    ],
    yue: [
      '呢度嘅霓虹燈唔使瞓……你最鍾意邊個招牌呀？',
      '落雨令霓虹變成雙份……個倒影好靚，係咪？',
      '呢條街好似未來咁……你想先去邊度探險呀？',
    ],
    zh: [
      '这里的霓虹灯不用睡觉……你最喜欢哪个招牌？',
      '下雨让霓虹变成双份……倒影很美，对吧？',
      '这条街像未来一样……你想先去哪里探险？',
    ],
    ja: [
      'ここのネオンは眠らない……どの看板がお気に入り？',
      '雨でネオンが二重になる……反射、きれいでしょ？',
      'この街、未来みたい……どこから探検する？',
    ],
  },
  snowmoon: {
    en: [
      'The snow is glowing under the moon… fancy a quiet walk?',
      'They say every snowflake is different… shall we catch some and compare?',
      'Moonlit snow crunches like sugar… want to hear it?',
    ],
    yue: [
      '月光下面嘅雪識發光……一齊靜靜咁散步好唔好？',
      '聽講每片雪花都唔同……一齊接住幾片比較下啦？',
      '月光雪踩落去沙沙聲好似砂糖……你想唔想聽吓呀？',
    ],
    zh: [
      '月光下的雪会发光……一起安静地散步好吗？',
      '听说每片雪花都不同……一起接住几片比比看？',
      '月光下的雪踩上去沙沙响，像砂糖……你想听听吗？',
    ],
    ja: [
      '月光の雪、光ってる……静かに散歩しよっか？',
      '雪の結晶は全部違うんだって……受け止めて比べてみる？',
      '月明かりの雪、砂糖みたいに音がする……聞いてみる？',
    ],
  },
  galaxy: {
    en: [
      'We can see the whole galaxy from here… what do you think is out there?',
      'Somewhere out there a star is being born right now… what do you wish for?',
      'The Milky Way looks like a river of light… want to sail it someday?',
    ],
    yue: [
      '喺呢度望到成個銀河……你覺得宇宙入面有咩呀？',
      '宇宙某處有粒星而家先啱啱誕生……你有咩願望呀？',
      '銀河好似一條光嘅河……有機會一齊去航行好唔好？',
    ],
    zh: [
      '在这里能看到整个银河……你觉得宇宙里有什么？',
      '宇宙某处有颗星星刚刚诞生……你有什么愿望？',
      '银河像一条光的河……有机会一起去航行好吗？',
    ],
    ja: [
      'ここから銀河が丸見え……宇宙に何があると思う？',
      '宇宙のどこかで星が生まれてる……何を願う？',
      '天の川、光の川みたい……いつか渡ってみる？',
    ],
  },
};

/** Deterministic scene line (same pickLine rotation as the persona banks). */
export function pickSceneLine(sceneId: string, lang: Lang, n: number): string | undefined {
  const bank = SCENE_LINES[sceneId]?.[lang] ?? SCENE_LINES[sceneId]?.en;
  if (!bank || bank.length === 0) return undefined;
  return bank[((n % bank.length) + bank.length) % bank.length];
}

// ---------------------------------------------------------------------------
// Prompt add-on — appended to the persona so both the server route and the
// client-chat lane receive it through the same opaque string.
// ---------------------------------------------------------------------------
export interface AdaptiveOpts {
  /** backdrop id (kept for future scene-specific logic) */
  sceneId: string;
  /** display name of the backdrop, already localized */
  sceneName: string;
  characterGender: 'female' | 'male';
  /** undefined = the profile never picked one — behaves exactly like 'secret' */
  userGender?: Gender;
  kidMode: boolean;
}

export function adaptiveBlock(opts: AdaptiveOpts): string {
  const parts: string[] = [];
  parts.push(
    `Setting: you are in "${opts.sceneName}" with the user. Let the place colour your words — casually mention the surroundings, the light, or the mood of the scene, and sometimes suggest something to do there.`,
  );
  const ug = opts.userGender;
  if (opts.kidMode) {
    parts.push(
      'The user is a child: keep everything wholesome and friendly, like a trusted best friend — no romance, no flirting, no grown-up teasing.',
    );
  } else if (!ug || ug === 'secret') {
    // gender kept private (or never set) — the base persona already carries
    // the warmth, so no extra guidance is added and nothing changes for
    // those users
  } else if (ug === opts.characterGender) {
    parts.push(
      'The user is the same gender as you. Be their warm best mate — easy banter, honest encouragement, always on their side.',
    );
  } else if (ug === 'male') {
    parts.push(
      'The user is a man. Gentle warmth: adore him like a close friend with a soft spot for him — light, tasteful affection is welcome, and always cheer him up first.',
    );
  } else {
    parts.push(
      'The user is a woman. Gentle warmth: adore her like a close friend with a soft spot for her — light, tasteful affection is welcome, and always cheer her up first.',
    );
  }
  return '\n' + parts.join('\n');
}
