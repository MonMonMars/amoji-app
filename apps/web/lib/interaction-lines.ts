'use client';
// Cheerful interaction lines. One pool per personality × region × language,
// more than 10 each, randomized without an immediate repeat.
// Personalities are auto-assigned (see personality.ts), not hand-listed per character.

import type { Lang } from './prefs';
import type { PersonalityId } from './personality';
import { personalityFor, profilePokeLine } from './personality';
import type { PokeDirection, TalkZone } from './poke-hit';

export type InteractZone = TalkZone;

const ZONES: InteractZone[] = ['head', 'torso', 'chest', 'side', 'back', 'hand', 'armL', 'armR', 'belly', 'butt', 'legL', 'legR', 'foot'];

const REGION: Record<InteractZone, Record<Lang, string>> = {
  head:  { yue: '個頭', zh: '脑袋', ja: '頭', en: 'head' },
  torso: { yue: '身', zh: '身子', ja: '体', en: 'torso' },
  chest: { yue: '心口', zh: '心口', ja: '胸', en: 'chest' },
  side:  { yue: '側邊', zh: '侧边', ja: '横', en: 'side' },
  back:  { yue: '背脊', zh: '后背', ja: '背中', en: 'back' },
  hand:  { yue: '隻手', zh: '手', ja: '手', en: 'hand' },
  armL:  { yue: '左手', zh: '左手', ja: '左腕', en: 'left arm' },
  armR:  { yue: '右手', zh: '右手', ja: '右腕', en: 'right arm' },
  belly: { yue: '個肚', zh: '肚子', ja: 'お腹', en: 'tummy' },
  butt:  { yue: '尻', zh: '屁股', ja: 'お尻', en: 'butt' },
  legL:  { yue: '左腳', zh: '左腿', ja: '左足', en: 'left leg' },
  legR:  { yue: '右腳', zh: '右腿', ja: '右足', en: 'right leg' },
  foot:  { yue: '隻腳', zh: '脚', ja: '足', en: 'foot' },
};

const VIBE: Record<PersonalityId, Record<Lang, string>> = {
  sunny:   { yue: '哈哈', zh: '哈哈', ja: 'あはは', en: 'Haha' },
  shy:     { yue: '咿呀', zh: '呀', ja: 'えへへ', en: 'Eep' },
  playful: { yue: '嘻嘻', zh: '嘻嘻', ja: 'ふふっ', en: 'Hehe' },
  gentle:  { yue: '呵呵', zh: '呵呵', ja: 'うふふ', en: 'Hee' },
  dreamy:  { yue: '哇', zh: '哇', ja: 'わあ', en: 'Whoa' },
  spark:   { yue: '呀哈', zh: '呀哈', ja: 'やっほー', en: 'Yahoo' },
  steady:  { yue: '哈哈', zh: '哈哈', ja: 'はは', en: 'Ha' },
  cool:    { yue: '哼哼', zh: '哼哼', ja: 'ふっ', en: 'Heh' },
  warm:    { yue: '哈哈', zh: '哈哈', ja: 'はっは', en: 'Haha' },
  quiet:   { yue: '呵', zh: '呵', ja: 'ふふ', en: 'Hm' },
  sporty:  { yue: '喂哈', zh: '嘿哈', ja: 'おほっ', en: 'Hey' },
  wry:     { yue: '呵', zh: '呵', ja: 'くすっ', en: 'Heh' },
};

function templates(lang: Lang, vibe: string, region: string, i: number): string {
  const n = i + 1;
  if (lang === 'yue') {
    const bank = [
      `${vibe}，你拮我${region}，我差啲笑到坐低，仲想玩嗎？`,
      `${vibe}～${region}中招啦，我要反擊㗎，你怕唔怕？`,
      `哈哈，${region}咁敏感，你係咪專登嘅？`,
      `${vibe}，拉住${region}都要講笑，你今日份外頑皮呀？`,
      `嘻，${region}被你捉到，我獎勵你一個笑容，好唔好？`,
      `${vibe}，呢下${region}好好笑，再嚟一次定換邊？`,
      `哈哈，${region}話想同你玩，你應唔應？`,
      `${vibe}，我${region}都笑緊，你聽到未？`,
      `好彩我心情靚，${region}先唔計較，你想聽個笑話嗎？`,
      `${vibe}，${region}第${n}下都仲好笑，你仲有冇新招？`,
      `哈哈，捉${region}要溫柔啲呀，明白未？`,
      `${vibe}，我當你請我跳舞，${region}先，你跳唔跳？`,
    ];
    return bank[i % bank.length]!;
  }
  if (lang === 'zh') {
    const bank = [
      `${vibe}，你戳到我的${region}，我差点笑坐下去，还想玩吗？`,
      `${vibe}～${region}中招了，我要反击哦，你怕不怕？`,
      `哈哈，${region}这么敏感，你是故意的吗？`,
      `${vibe}，牵着${region}也要开玩笑，你今天特别皮吗？`,
      `嘻，${region}被你抓到，我奖你一个笑容，好不好？`,
      `${vibe}，这一下${region}好好笑，再来一次还是换边？`,
      `哈哈，${region}说想跟你玩，你答应吗？`,
      `${vibe}，我的${region}也在笑，你听见了吗？`,
      `幸好我心情好，${region}先不计较，想听个笑话吗？`,
      `${vibe}，${region}第${n}下还是好笑，你还有新招吗？`,
      `哈哈，碰${region}要温柔一点呀，明白了吗？`,
      `${vibe}，我当你请我跳舞，先从${region}开始，你跳不跳？`,
    ];
    return bank[i % bank.length]!;
  }
  if (lang === 'ja') {
    const bank = [
      `${vibe}、${region}をつついたね。笑いすぎたよ、まだ遊ぶ？`,
      `${vibe}、${region}ヒット！反撃していいかな？`,
      `あはは、${region}敏感だね。わざと？`,
      `${vibe}、${region}を握ってまでふざけるの？今日は調子いい？`,
      `ふふ、${region}を見つけたね。笑顔ごほうび、いる？`,
      `${vibe}、この${region}おもしろい。もう一回？それとも反対？`,
      `あはは、${region}が遊びたがってる。付き合う？`,
      `${vibe}、${region}まで笑ってるの聞こえる？`,
      `機嫌がいいから${region}は許す。ジョーク聞く？`,
      `${vibe}、${region}の${n}回目も面白い。新しい技ある？`,
      `あはは、${region}はやさしくね。わかった？`,
      `${vibe}、ダンスのお誘いってことで${region}から。踊る？`,
    ];
    return bank[i % bank.length]!;
  }
  const bank = [
    `${vibe}, you got my ${region}. I nearly sat down laughing — still playing?`,
    `${vibe}! ${region} hit. Do I get a silly counterattack?`,
    `Haha, that ${region} is ticklish. Was that on purpose?`,
    `${vibe}, holding my ${region} and joking — extra playful today?`,
    `Hehe, you found the ${region}. Want a smile as a prize?`,
    `${vibe}, that ${region} poke was funny. Again, or the other side?`,
    `Haha, my ${region} wants to play. Are you in?`,
    `${vibe}, even my ${region} is laughing. Can you hear it?`,
    `Good mood, so the ${region} is forgiven. Want a joke?`,
    `${vibe}, ${region} tap number ${n} still works. Got a new move?`,
    `Haha, be gentle with the ${region}, okay?`,
    `${vibe}, I'll count that as a dance invite, starting at the ${region}. You dancing?`,
  ];
  return bank[i % bank.length]!;
}

export function interactionLines(personality: PersonalityId, zone: string, lang: Lang): string[] {
  const z = (ZONES as string[]).includes(zone) ? zone as InteractZone : 'torso';
  const vibe = VIBE[personality][lang];
  const region = REGION[z][lang];
  return Array.from({ length: 12 }, (_, i) => templates(lang, vibe, region, i));
}

/** One short question after a poke. The long banks stay for idle chatter. */
function shortTalk(lang: Lang, vibe: string, region: string, i: number): string {
  const n = (i % 12) + 1;
  if (lang === 'yue') {
    const bank = [
      `${vibe}，${region}呀？`,
      `${vibe}，再拮${region}？`,
      `${vibe}，玩${region}？`,
      `${vibe}，第${n}下？`,
      `${vibe}，${region}中招？`,
      `${vibe}，輕輕${region}？`,
      `${vibe}，${region}想玩？`,
      `${vibe}，咁拮${region}？`,
      `${vibe}，${region}好唔好？`,
      `${vibe}，換個${region}？`,
      `${vibe}，${region}笑咗？`,
      `${vibe}，仲玩${region}？`,
    ];
    return bank[i % bank.length]!;
  }
  if (lang === 'zh') {
    const bank = [
      `${vibe}，${region}呀？`,
      `${vibe}，再戳${region}？`,
      `${vibe}，玩${region}？`,
      `${vibe}，第${n}下？`,
      `${vibe}，${region}中招？`,
      `${vibe}，轻轻${region}？`,
      `${vibe}，${region}想玩？`,
      `${vibe}，这么戳${region}？`,
      `${vibe}，${region}好不好？`,
      `${vibe}，换个${region}？`,
      `${vibe}，${region}笑了？`,
      `${vibe}，还玩${region}？`,
    ];
    return bank[i % bank.length]!;
  }
  if (lang === 'ja') {
    const bank = [
      `${vibe}、${region}？`,
      `${vibe}、もう一回${region}？`,
      `${vibe}、${region}遊ぶ？`,
      `${vibe}、${n}回目？`,
      `${vibe}、${region}ヒット？`,
      `${vibe}、やさしく${region}？`,
      `${vibe}、${region}したい？`,
      `${vibe}、そこ${region}？`,
      `${vibe}、${region}どう？`,
      `${vibe}、別の${region}？`,
      `${vibe}、${region}笑った？`,
      `${vibe}、まだ${region}？`,
    ];
    return bank[i % bank.length]!;
  }
  const bank = [
    `${vibe}, my ${region}?`,
    `${vibe}, that ${region} again?`,
    `${vibe}, playing with my ${region}?`,
    `${vibe}, tap ${n}?`,
    `${vibe}, ${region} hit?`,
    `${vibe}, gentle on the ${region}?`,
    `${vibe}, my ${region} wants to play?`,
    `${vibe}, that ${region}?`,
    `${vibe}, like that ${region}?`,
    `${vibe}, other ${region}?`,
    `${vibe}, the ${region} laughed?`,
    `${vibe}, still my ${region}?`,
  ];
  return bank[i % bank.length]!;
}

export function shortInteractionLines(personality: PersonalityId, zone: string, lang: Lang): string[] {
  const z = (ZONES as string[]).includes(zone) ? zone as InteractZone : 'torso';
  const vibe = VIBE[personality][lang];
  const region = REGION[z][lang];
  return Array.from({ length: 12 }, (_, i) => shortTalk(lang, vibe, region, i));
}

const lastPick = new Map<string, number>();

/** Randomized line for this personality and zone. Skips the line just played. */
export function pickInteractionLine(personality: PersonalityId, zone: string, lang: Lang): string {
  const list = shortInteractionLines(personality, zone, lang);
  let i = Math.floor(Math.random() * list.length);
  const key = `${personality}:${zone}:${lang}`;
  if (list.length > 1 && i === lastPick.get(key)) i = (i + 1) % list.length;
  lastPick.set(key, i);
  return list[i]!;
}

export function pickCharacterInteraction(characterId: string, gender: 'female' | 'male' | undefined, zone: string, lang: Lang): string {
  const personality = personalityFor(characterId, gender);
  const list = shortInteractionLines(personality, zone, lang);
  const key = `${characterId}:${zone}:${lang}`;
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastPick.get(key)) i = (i + 1) % list.length;
  lastPick.set(key, i);
  return list[i]!;
}

const DIR_WORD: Record<PokeDirection, Record<Lang, string>> = {
  front: { en: 'from the front', yue: '由前面', zh: '从前面', ja: '前から' },
  back: { en: 'from behind', yue: '由後面', zh: '从后面', ja: '後ろから' },
  left: { en: 'from the left', yue: '由左邊', zh: '从左边', ja: '左から' },
  right: { en: 'from the right', yue: '由右邊', zh: '从右边', ja: '右から' },
};

export type PokePhase = 'impact' | 'recover' | 'settle';

/** impact on the first poke, then recover, then settle, then around again. */
export function pokePhase(count: number): PokePhase {
  const phases = ['impact', 'recover', 'settle'] as const;
  const n = Math.max(0, Math.abs(Math.trunc(count)) - 1);
  return phases[n % 3]!;
}

function asDirection(direction: string): PokeDirection {
  if (direction === 'back' || direction === 'left' || direction === 'right') return direction;
  return 'front';
}

function phaseLine(phase: PokePhase, lang: Lang, vibe: string, region: string, dir: string, n: number): string {
  const k = (Math.abs(n) % 8) + 1;
  if (lang === 'yue') {
    const bank = phase === 'impact'
      ? [
        `${vibe}，${region}${dir}？`,
        `${vibe}，${dir}打中${region}？`,
        `${vibe}，第${k}下${dir}？`,
        `${vibe}，${region}中咗${dir}？`,
        `${vibe}，${dir}好大力呀？`,
        `${vibe}，${region}收到${dir}？`,
        `${vibe}，呢下${dir}算唔算？`,
        `${vibe}，${region}要還手${dir}？`,
      ]
      : [
        `${vibe}，${region}定咗。再${dir}？`,
        `${vibe}，緩過嚟喇。換邊${dir}？`,
        `${vibe}，${region}冇事。輕啲${dir}？`,
        `${vibe}，第${k}下完。仲玩？`,
        `${vibe}，${dir}收工未？`,
        `${vibe}，${region}企穩喇。再嚟？`,
        `${vibe}，好好，${dir}到此為止？`,
        `${vibe}，下一次${dir}溫柔啲？`,
      ];
    return bank[Math.abs(n) % bank.length]!;
  }
  if (lang === 'zh') {
    const bank = phase === 'impact'
      ? [
        `${vibe}，${region}${dir}？`,
        `${vibe}，${dir}打中${region}？`,
        `${vibe}，第${k}下${dir}？`,
        `${vibe}，${region}中了${dir}？`,
        `${vibe}，${dir}好大呀？`,
        `${vibe}，${region}收到${dir}？`,
        `${vibe}，这一下${dir}算不算？`,
        `${vibe}，${region}要还手${dir}？`,
      ]
      : [
        `${vibe}，${region}稳了。再${dir}？`,
        `${vibe}，缓过来了。换边${dir}？`,
        `${vibe}，${region}没事。轻一点${dir}？`,
        `${vibe}，第${k}下结束。还玩？`,
        `${vibe}，${dir}收工了吗？`,
        `${vibe}，${region}站稳了。再来？`,
        `${vibe}，好，${dir}到这里？`,
        `${vibe}，下次${dir}温柔一点？`,
      ];
    return bank[Math.abs(n) % bank.length]!;
  }
  if (lang === 'ja') {
    const bank = phase === 'impact'
      ? [
        `${vibe}、${region}、${dir}？`,
        `${vibe}、${dir}が${region}に当たった？`,
        `${vibe}、${k}発目、${dir}？`,
        `${vibe}、${region}ヒット、${dir}？`,
        `${vibe}、${dir}は強かった？`,
        `${vibe}、${region}、${dir}届いた？`,
        `${vibe}、この${dir}、アリ？`,
        `${vibe}、${region}から${dir}に返す？`,
      ]
      : [
        `${vibe}、${region}は落ち着いた。また${dir}？`,
        `${vibe}、戻った。別の${dir}？`,
        `${vibe}、${region}は大丈夫。優しく${dir}？`,
        `${vibe}、${k}発目おしまい。まだ？`,
        `${vibe}、${dir}は終わり？`,
        `${vibe}、${region}は立ってる。もう一回？`,
        `${vibe}、よし、${dir}はここまで？`,
        `${vibe}、次の${dir}はそっと？`,
      ];
    return bank[Math.abs(n) % bank.length]!;
  }
  const bank = phase === 'impact'
    ? [
      `${vibe}, ${region} ${dir}?`,
      `${vibe}, a punch ${dir} on the ${region}?`,
      `${vibe}, hit ${k} ${dir}?`,
      `${vibe}, the ${region} caught that ${dir}?`,
      `${vibe}, ${dir} came in hot. Still playing?`,
      `${vibe}, ${region} got the ${dir} one. Fair?`,
      `${vibe}, does ${dir} count?`,
      `${vibe}, ${region} wants a turn ${dir}?`,
    ]
    : [
      `${vibe}, ${region} settled. Another ${dir}?`,
      `${vibe}, back on my feet. Switch the ${dir}?`,
      `${vibe}, ${region} is fine. Softer ${dir}?`,
      `${vibe}, hit ${k} is done. Still in?`,
      `${vibe}, is ${dir} finished?`,
      `${vibe}, ${region} is steady. Once more?`,
      `${vibe}, okay, ${dir} ends there?`,
      `${vibe}, next ${dir} a little gentler?`,
    ];
  return bank[Math.abs(n) % bank.length]!;
}

/**
 * Spoken poke line. Phase follows the punch (impact, recover, settle) and
 * the words change with personality, body part, direction, and poke count.
 */
export function pokeReactionLine(
  characterId: string,
  gender: 'female' | 'male' | undefined,
  zone: string,
  direction: string,
  lang: Lang,
  count: number,
): string {
  const personality = personalityFor(characterId, gender);
  const z = (ZONES as string[]).includes(zone) ? zone as InteractZone : 'torso';
  const d = asDirection(direction);
  const phase = pokePhase(count);
  const vibe = VIBE[personality][lang];
  const region = REGION[z][lang];
  const dir = DIR_WORD[d][lang];
  const n = Math.max(0, Math.abs(Math.trunc(count)) - 1);
  if (phase === 'recover') {
    const voice = profilePokeLine(characterId, lang, n + (d === 'left' ? 1 : d === 'right' ? 2 : d === 'back' ? 3 : 0), z, gender);
    return `${dir}. ${voice}`;
  }
  return phaseLine(phase, lang, vibe, region, dir, n);
}

const LAUGHS: Record<Lang, string[]> = {
  yue: ['哈哈', '嘻嘻', '呵呵'],
  zh: ['哈哈', '嘻嘻', '呵呵'],
  ja: ['あはは', 'ふふ', 'えへへ'],
  en: ['Ha ha', 'Heh heh', 'Haha'],
};

/**
 * Sometimes a short chuckle before the poke line. No trailing bang and only
 * a slight lift — an isolated "Haha!" at a high pitch/rate is what the
 * engines yelp, and that rate was sticking onto the next sentence.
 */
/** t769/t771: unsolicited TTS chuckle leads are banned — poke laugh SFX still OK. */
export function maybeLaughLead(_lang: Lang): { text: string; pitch: number; rate: number } | undefined {
  return undefined;
}

export function personalityIdleLine(personality: PersonalityId, lang: Lang, n: number): string {
  return interactionLines(personality, 'torso', lang)[Math.abs(n) % 12]!.replace(
    lang === 'en' ? 'torso' : REGION.torso[lang],
    lang === 'yue' ? '今日' : lang === 'zh' ? '今天' : lang === 'ja' ? '今日' : 'today',
  );
}
