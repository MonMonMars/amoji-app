import type { Lang } from './prefs';
import type { Gender } from './profile';

// r2026-10-04.70 — the dialogue adapts to the world around her:
// 1. SCENE_LINES: every backdrop gets its own ambient idle voice, so the
//    place she sits in shows up in what she says between conversations.
// 2. adaptiveBlock: light scene context for the model (no forced scenery) and
//    calibrates warmth to the pairing — opposite-sex gets gentle affection,
//    same-gender gets best-mate tone, kid mode and "secret" stay
//    friendship-only.
// r2026-10-04.70c: userGender is OPTIONAL — a profile that never set it
//    passes undefined, which behaves exactly like "secret" (no guidance).

// ---------------------------------------------------------------------------
// Scene banks — one per backdrop. Prefer warm, grounded atmosphere
// (statements OK). Avoid cartoon nonsense (“sit on a cloud”, “bounce”).
// ---------------------------------------------------------------------------
export const SCENE_LINES: Record<string, Record<Lang, string[]>> = {
  void: {
    en: [
      'The stars are so clear tonight. The whole sky feels close.',
      'Looking up here, the night feels wide and quiet.',
      'The night sky makes everything feel a little more possible.',
    ],
    yue: [
      '今晚啲星星真係好清。成片夜空都好近。',
      '喺呢度抬頭望，夜晚好闊又好靜。',
      '夜空下面，好多嘢都忽然覺得有可能。',
    ],
    zh: [
      '今晚的星星好清楚。整片夜空都显得很近。',
      '在这里抬头看，夜晚又阔又静。',
      '夜空下面，很多事都忽然觉得有可能。',
    ],
    ja: [
      '今夜の星、すごく綺麗。空が近く感じる。',
      'ここで見上げると、夜が広くて静か。',
      '夜空の下では、何でも少し可能に感じる。',
    ],
  },
  aurora: {
    en: [
      'The aurora is dancing again — green light across the sky.',
      'People say the aurora hums if you listen. The air feels soft.',
      'Green fire stretches over us. I’m glad we’re under it together.',
    ],
    yue: [
      '極光又喺度跳緊舞，綠光鋪滿成片天。',
      '人話極光識唱歌。空氣都覺得柔啲。',
      '天上嘅綠火咁靚。有你一齊睇，我覺得好襯。',
    ],
    zh: [
      '极光又在跳舞了，绿光铺满整片天。',
      '人们说极光会唱歌。空气都显得柔一些。',
      '天上的绿火那么美。有你一起看，我觉得很合适。',
    ],
    ja: [
      'オーロラがまた踊ってる。緑の光が空を覆ってる。',
      'オーロラは音が鳴るって言う。空気がやさしい。',
      '空の緑の炎。一緒に見られてうれしい。',
    ],
  },
  ember: {
    en: [
      'These embers make everything feel warm and close.',
      'Firelight softens every face. It feels cozy here.',
      'The fire crackles like it’s telling quiet stories.',
    ],
    yue: [
      '啲火種令成個地方暖晒，又好近。',
      '火光映得人面都柔啲。呢度好溫暖。',
      '柴火劈啪劈啪，好似靜靜咁講緊故事。',
    ],
    zh: [
      '余烬让整个地方暖暖的，也很近。',
      '火光映得人脸都柔和了。这里很温暖。',
      '柴火噼啪噼啪，像在轻轻讲故事。',
    ],
    ja: [
      '焚き火の温もりで、全部が近く感じる。',
      '火の光で顔がやわらかく見える。ここ、あったかい。',
      '薪がパチパチ、静かな物語みたい。',
    ],
  },
  sakura: {
    en: [
      'The petals are falling like slow pink snow.',
      'One season, one bloom — the air smells like spring.',
      'A petal just drifted past. It feels lucky somehow.',
    ],
    yue: [
      '花瓣落得慢過落雪，粉粉地。',
      '一期一會。空氣都有陣春天味。',
      '有片花瓣飄過。忽然覺得好幸運。',
    ],
    zh: [
      '花瓣落得比雪还慢，粉粉的。',
      '一期一会。空气里都有春天的味道。',
      '一片花瓣飘过。忽然觉得很幸运。',
    ],
    ja: [
      '花びらがゆっくり降ってる。ピンクの雪みたい。',
      '一期一会。空気が春の匂い。',
      '花びらがひとつ流れた。なんだかラッキー。',
    ],
  },
  abyss: {
    en: [
      'It’s so quiet down here. Distant whales feel far away.',
      'Light from the surface is our skylight. Soft and blue.',
      'Fish keep peeking past us like we’re part of the scene.',
    ],
    yue: [
      '呢度靜到只聽到水底嘅聲。遠處好似有鯨魚。',
      '上面落嚟嘅光就係我哋嘅天窗。又柔又藍。',
      '啲魚成日偷睇過，好似我哋都係景色一部份。',
    ],
    zh: [
      '这里安静得只听见水声。远处像有鲸鱼。',
      '上面透下来的光就是我们的天窗。又柔又蓝。',
      '鱼儿总悄悄游过，好像我们也是景色的一部分。',
    ],
    ja: [
      'ここ、静かだね。遠くでクジラがいる気がする。',
      '上から差す光が天窓みたい。やさしくて青い。',
      '魚たちが覗いて通る。私たちも景色の一部みたい。',
    ],
  },
  rain: {
    en: [
      'The rain sounds like a lullaby on the window.',
      'Every raindrop taps the glass in a soft rhythm.',
      'Rainy days feel made for quiet company.',
    ],
    yue: [
      '雨點滴滴答答好似搖籃曲。',
      '每滴雨都喺度輕輕敲玻璃。',
      '落雨天最啱靜靜咁陪住。',
    ],
    zh: [
      '雨点滴滴答答像摇篮曲。',
      '每一滴雨都在轻轻敲玻璃。',
      '下雨天最适合安静地陪着。',
    ],
    ja: [
      '雨の音、子守歌みたい。',
      '雨粒がガラスをやさしく叩いてる。',
      '雨の日は、静かにそばにいるのにぴったり。',
    ],
  },
  sunset: {
    en: [
      'The sky’s turning gold. The sun is easing down.',
      'Clouds are catching fire in the best way.',
      'Sunsets always feel like the day’s last quiet gift.',
    ],
    yue: [
      '個天變成金色喇。日落慢慢沉落。',
      '雲朵燒起上嚟咁靚。',
      '日落好似今日嘅最後一份靜靜禮物。',
    ],
    zh: [
      '天空变成金色了。日落慢慢沉下去。',
      '云朵烧起来那么美。',
      '日落就像今天的最后一份安静礼物。',
    ],
    ja: [
      '空が金色になってきた。夕日が沈んでいく。',
      '雲が燃えてるみたいで綺麗。',
      '夕日は一日の最後の静かな贈り物みたい。',
    ],
  },
  meadow: {
    en: [
      'The grass smells like summer. The hill is soft underfoot.',
      'A ladybug just landed nearby. Tiny and bright.',
      'The breeze keeps playing with the grass. It feels light.',
    ],
    yue: [
      '青草味好似夏天。山丘踩落去好軟。',
      '有隻瓢蟲停喺附近。細細粒又好鮮。',
      '微風不停撩草。成個感覺都輕鬆啲。',
    ],
    zh: [
      '青草的味道像夏天。山丘踩上去很软。',
      '一只瓢虫停在附近。小小的，很鲜亮。',
      '微风不停地撩草。整个人都轻松一些。',
    ],
    ja: [
      '草の匂い、夏みたい。丘がやわらかい。',
      'てんとう虫が近くに止まった。小さくて鮮やか。',
      '風が草を揺らしてる。気持ちが軽い。',
    ],
  },
  cloudsea: {
    // Grounded atmosphere — poetic but not cartoon “sit on a cloud / bounce”.
    en: [
      'We’re above the clouds tonight. The view is quiet and wide.',
      'The sun is sinking into the cloud-sea — warm light on every layer.',
      'It feels like looking over a soft ocean of mist. I’m glad you’re here for it.',
    ],
    yue: [
      '我哋喺雲海上面。景色好靜，又好闊。',
      '個日落慢慢沉入雲海，層層光都暖暖地。',
      '望落去好似一片霧海。有你一齊睇，我覺得好襯。',
    ],
    zh: [
      '我们在云海上面。景色很静，也很开阔。',
      '夕阳慢慢沉进云海，每一层光都带着暖意。',
      '望下去像一片雾海。有你一起看，我觉得很合适。',
    ],
    ja: [
      '雲海の上にいるよ。景色は静かで、とても広い。',
      '夕日が雲海に沈んでいく。層ごとの光がやさしい。',
      '霧の海を見下ろしてるみたい。一緒に見られてうれしい。',
    ],
  },
  neon: {
    en: [
      'The city lights never sleep here. Signs glow in every color.',
      'Rain makes the neon double in the puddles.',
      'This street feels like the future — bright and awake.',
    ],
    yue: [
      '呢度嘅霓虹燈唔使瞓。招牌每一種色都亮住。',
      '落雨令霓虹變成雙份，倒影喺水窪度。',
      '呢條街好似未來咁，又光又醒。',
    ],
    zh: [
      '这里的霓虹灯不用睡觉。招牌每一种颜色都亮着。',
      '下雨让霓虹变成双份，倒影在水洼里。',
      '这条街像未来一样，又亮又醒。',
    ],
    ja: [
      'ここのネオンは眠らない。看板が色とりどりに光ってる。',
      '雨でネオンが水たまりに二重になる。',
      'この街、未来みたい。明るくて起きてる。',
    ],
  },
  snowmoon: {
    en: [
      'The snow is glowing under the moon. Soft and silver.',
      'Every snowflake looks different under this light.',
      'Moonlit snow crunches like sugar underfoot.',
    ],
    yue: [
      '月光下面嘅雪識發光。又軟又銀。',
      '每片雪花喺呢啲光下面都好似唔同。',
      '月光雪踩落去沙沙聲好似砂糖。',
    ],
    zh: [
      '月光下的雪会发光。又软又银。',
      '每片雪花在这种光下都像不一样。',
      '月光下的雪踩上去沙沙响，像砂糖。',
    ],
    ja: [
      '月光の雪、光ってる。やわらかくて銀色。',
      'この光の下だと雪の結晶が全部違って見える。',
      '月明かりの雪、砂糖みたいに音がする。',
    ],
  },
  galaxy: {
    en: [
      'We can see the whole galaxy from here. Endless quiet light.',
      'Somewhere out there a star is being born right now.',
      'The Milky Way looks like a river of light across the dark.',
    ],
    yue: [
      '喺呢度望到成個銀河。無盡又靜嘅光。',
      '宇宙某處有粒星而家先啱啱誕生。',
      '銀河好似一條光嘅河，劃過黑暗。',
    ],
    zh: [
      '在这里能看到整个银河。无尽又安静的光。',
      '宇宙某处有颗星星刚刚诞生。',
      '银河像一条光的河，划过黑暗。',
    ],
    ja: [
      'ここから銀河が丸見え。静かな光が果てしない。',
      '宇宙のどこかで星が生まれてる。',
      '天の川、光の川みたいに闇を横切ってる。',
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
    `Setting: you and the user are in "${opts.sceneName}". Treat the scene as quiet backdrop context — answer what the user actually asked first; only nod to the setting when they bring it up or when one brief natural touch fits. Do not pad replies with forced scenery, weather metaphors, or activity suggestions tied to the backdrop.`,
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
