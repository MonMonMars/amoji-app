'use client';
// Cheerful interaction lines. One pool per personality × region × language,
// more than 10 each, randomized without an immediate repeat.
// Personalities are auto-assigned (see personality.ts), not hand-listed per character.

import type { Lang } from './prefs';
import type { PersonalityId } from './personality';
import { profilePokeLine } from './personality';
import type { TalkZone } from './poke-hit';

export type InteractZone = TalkZone | 'hand';

const ZONES: InteractZone[] = ['head', 'torso', 'chest', 'side', 'back', 'hand'];

const REGION: Record<InteractZone, Record<Lang, string>> = {
  head:  { yue: '個頭', zh: '脑袋', ja: '頭', en: 'head' },
  torso: { yue: '身', zh: '身子', ja: '体', en: 'torso' },
  chest: { yue: '心口', zh: '心口', ja: '胸', en: 'chest' },
  side:  { yue: '側邊', zh: '侧边', ja: '横', en: 'side' },
  back:  { yue: '背脊', zh: '后背', ja: '背中', en: 'back' },
  hand:  { yue: '隻手', zh: '手', ja: '手', en: 'hand' },
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

const lastPick = new Map<string, number>();

/** Randomized line for this personality and zone. Skips the line just played. */
export function pickInteractionLine(personality: PersonalityId, zone: string, lang: Lang): string {
  const list = interactionLines(personality, zone, lang);
  let i = Math.floor(Math.random() * list.length);
  const key = `${personality}:${zone}:${lang}`;
  if (list.length > 1 && i === lastPick.get(key)) i = (i + 1) % list.length;
  lastPick.set(key, i);
  return list[i]!;
}

export function pickCharacterInteraction(characterId: string, gender: 'female' | 'male' | undefined, zone: string, lang: Lang): string {
  const pool = 8;
  let i = Math.floor(Math.random() * pool);
  const key = `${characterId}:${zone}:${lang}`;
  if (i === lastPick.get(key)) i = (i + 1) % pool;
  lastPick.set(key, i);
  return profilePokeLine(characterId, lang, i, zone, gender);
}

const LAUGHS: Record<Lang, string[]> = {
  yue: ['哈哈！', '嘻嘻！', '呵呵！'],
  zh: ['哈哈！', '嘻嘻！', '呵呵！'],
  ja: ['あはは！', 'ふふっ！', 'えへへ！'],
  en: ['Haha!', 'Hehe!', 'Ha!'],
};

/** Sometimes a short laugh before the line. Null when this poke stays words-only. */
export function maybeLaughLead(lang: Lang): { text: string; pitch: number; rate: number } | undefined {
  if (Math.random() > 0.45) return undefined;
  const list = LAUGHS[lang] ?? LAUGHS.en;
  const text = list[Math.floor(Math.random() * list.length)]!;
  return { text, pitch: 0.18, rate: 0.08 };
}

export function personalityIdleLine(personality: PersonalityId, lang: Lang, n: number): string {
  return interactionLines(personality, 'torso', lang)[Math.abs(n) % 12]!.replace(
    lang === 'en' ? 'torso' : REGION.torso[lang],
    lang === 'yue' ? '今日' : lang === 'zh' ? '今天' : lang === 'ja' ? '今日' : 'today',
  );
}
