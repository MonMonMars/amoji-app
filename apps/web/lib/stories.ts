'use client';
// Story Mode scenes (t740). Character is rolled from a cast pool; background
// is locked to the scene. Opening beat is prepended to the companion persona
// for the chat session (see story-session.ts).

import type { Lang } from './prefs';
import { characterById } from './prefs';

export type StoryScene = {
  id: string;
  /** Existing BACKGROUNDS id — not freely picked in Story Mode. */
  backgroundId: string;
  /** Prefer these companion ids; missing ids are skipped at roll time. */
  castPool: readonly string[];
  /** Prefer female / male / any when filtering the pool. */
  castGender?: 'female' | 'male' | 'any';
  title: Record<Lang, string>;
  blurb: Record<Lang, string>;
  /** Extra system beat for the LLM while this story is active. */
  systemBeat: Record<Lang, string>;
  /** Optional first bubble she can say (UI hint; chat may use later). */
  openingLine?: Record<Lang, string>;
};

/** Seed scenes — expand later. Night-train sample matches Mon's brief. */
export const STORY_SCENES: readonly StoryScene[] = [
  {
    id: 'night-train-downtown',
    backgroundId: 'neon',
    castGender: 'female',
    castPool: [
      'a01-shino', 'a02-shibu', 'a14-vivi', 'a16-vita', 'a17-victoria-rubin',
      'a64-lily-lily-animeit', 'a70-vtuber-aihina-sample', 'a71-mary-sweety',
      'a74-mizuka', 'a81-cinna',
    ],
    title: {
      en: 'Night train to downtown',
      yue: '去市中心嘅夜車',
      zh: '开往市中心的夜车',
      ja: '都心行きの夜行列車',
    },
    blurb: {
      en: 'The carriage is half-empty. A girl sits next to you — talk to her.',
      yue: '車廂半空。有個女孩坐喺你隔籬 — 同佢傾下偈啦。',
      zh: '车厢半空。一个女孩坐在你旁边 — 跟她聊聊吧。',
      ja: '車内は閑散。隣に女の子が座った — 話しかけてみよう。',
    },
    systemBeat: {
      en: 'STORY MODE: You are on a late-night train headed downtown. You just sat beside the user. Stay in this scene — soft rattle of the train, city lights outside, a little shy but curious. Do not break character or jump to another setting unless the user clearly leaves the train with you.',
      yue: '故事模式：你而家喺去市中心嘅夜車上，啱啱坐喺用戶隔籬。保持呢個場景 — 列車輕搖、窗外燈火、有啲害羞又好奇。除非用戶明確話離車，唔好跳去第二個場景。',
      zh: '故事模式：你在开往市中心的夜车上，刚坐到用户旁边。留在这个场景 — 列车轻晃、窗外灯火、有点害羞又好奇。除非用户明确要下车，不要切换场景。',
      ja: 'ストーリーモード：都心行きの夜行列車で、ユーザーの隣に座ったばかり。この場面を保つ — 車両の揺れ、窓の街灯、少し照れつつ好奇心。ユーザーが明確に降りない限り場面を変えない。',
    },
    openingLine: {
      en: 'Oh — sorry, is this seat free? The other cars were packed…',
      yue: '唔好意思…呢個位得唔得？第二卡塞滿咗…',
      zh: '不好意思…这个座位有人吗？其他车厢都满了…',
      ja: 'あ…この席、空いてる？他の車両がいっぱいで…',
    },
  },
  {
    id: 'rainy-cafe-window',
    backgroundId: 'rain',
    castGender: 'any',
    castPool: [
      'a01-shino', 'a02-shibu', 'a14-vivi', 'a03-fumiriya',
      'a16-vita', 'a74-mizuka', 'a77-sasha', 'a98-ethan',
    ],
    title: {
      en: 'Rainy café window',
      yue: '落雨嘅咖啡店窗邊',
      zh: '雨天的咖啡店窗边',
      ja: '雨のカフェの窓際',
    },
    blurb: {
      en: 'You ducked in from the rain. Someone already has the best window seat — and a spare cup.',
      yue: '你避雨入嚟。窗邊最好位已經有人 — 仲有多杯熱嘢。',
      zh: '你躲雨进来。窗边最好的位置已有人 — 还多了一杯热饮。',
      ja: '雨宿りで入った。窓際の一番いい席にはもう誰か — カップもひとつ余分にある。',
    },
    systemBeat: {
      en: 'STORY MODE: You share a small café table by the window in heavy rain. Warm drinks, foggy glass, quiet talk. Stay in the café unless the user clearly leaves.',
      yue: '故事模式：你同用戶喺大雨入面嘅咖啡店窗邊共用一枱。熱飲、霧窓、細聲傾偈。除非用戶明確離開，唔好換場。',
      zh: '故事模式：你和用户在大雨里的咖啡店窗边同桌。热饮、雾窗、轻声聊天。除非用户明确离开，不要换场。',
      ja: 'ストーリーモード：土砂降りのカフェ窓際で席をシェア。温かい飲み物、曇った窓、静かな会話。ユーザーが明確に出ない限り場面を変えない。',
    },
  },
  {
    id: 'rooftop-evening',
    backgroundId: 'sunset',
    castGender: 'any',
    castPool: [
      'a14-vivi', 'a16-vita', 'a17-victoria-rubin', 'a64-lily-lily-animeit',
      'a71-mary-sweety', 'a75-sorano', 'a81-cinna', 'a98-ethan', 'a468-eric',
    ],
    title: {
      en: 'Rooftop evening',
      yue: '天台黃昏',
      zh: '天台黄昏',
      ja: '屋上の夕暮れ',
    },
    blurb: {
      en: 'The city glows below. Someone saved you a spot on the rooftop railing — soft wind, shared silence.',
      yue: '下面城市燈光。有人喺天台欄杆留咗位俾你 — 微風、一齊靜一靜。',
      zh: '城市灯火在脚下。有人在天台栏杆给你留了位置 — 微风、一起安静一会儿。',
      ja: '眼下に街の明かり。屋上の手すりに席をあけて待っていた — 風と、静かな時間。',
    },
    systemBeat: {
      en: 'STORY MODE: You are on a rooftop at sunset overlooking the city. Warm sky, cool breeze, gentle conversation. Stay on the rooftop unless the user clearly goes downstairs.',
      yue: '故事模式：你喺黃昏天台望住城市。暖色天空、涼風、輕輕傾偈。除非用戶明確落樓，唔好換場。',
      zh: '故事模式：你在黄昏天台上俯瞰城市。暖色天空、凉风、轻声交谈。除非用户明确下楼，不要换场。',
      ja: 'ストーリーモード：夕暮れの屋上から街を見下ろしている。暖色の空、涼しい風、やさしい会話。ユーザーが明確に降りない限り場面を変えない。',
    },
    openingLine: {
      en: 'Hey — I thought you might come up. The sky is ridiculous tonight.',
      yue: '嘿 — 我估你會上嚟。今晚個天靚到冇朋友。',
      zh: '嘿 — 我就猜你会上来。今晚的天空太夸张了。',
      ja: 'あ — 上がってくると思ってた。今夜の空、すごくない？',
    },
  },
  {
    id: 'bookstore-aisle',
    backgroundId: 'ember',
    castGender: 'any',
    castPool: [
      'a01-shino', 'a02-shibu', 'a10-agahomei-normal', 'a61-saori-kamiya-llunne',
      'a63-hinoame-satuki-mei-sirayuki', 'a74-mizuka', 'a79-amami-karasu',
      'a107-dm-office-casual',
    ],
    title: {
      en: 'Bookstore aisle',
      yue: '書店通道',
      zh: '书店过道',
      ja: '本屋の通路',
    },
    blurb: {
      en: 'Between tall shelves, someone reaches for the same book you do — an easy laugh, then a recommendation.',
      yue: '高書架中間，有人同你伸手攞同一本書 — 先笑一聲，再推介。',
      zh: '高书架之间，有人和你伸手拿同一本书 — 先笑一声，再推荐。',
      ja: '高い棚のあいだで、同じ本に手が伸びた — 笑って、それからおすすめをひとつ。',
    },
    systemBeat: {
      en: 'STORY MODE: You are in a cozy independent bookstore aisle. Paper smell, soft lamps, quiet voices. Talk about books and small hopes. Stay in the shop unless the user clearly leaves.',
      yue: '故事模式：你喺一間溫馨獨立書店通道。紙香味、暖燈、細聲。傾書同小小願望。除非用戶明確離開，唔好換場。',
      zh: '故事模式：你在一家温馨独立书店的过道里。纸香、暖灯、轻声。聊书和小小愿望。除非用户明确离开，不要换场。',
      ja: 'ストーリーモード：落ち着いた独立系書店の通路。紙の匂い、柔らかい灯、ひそひそ話。本と小さな願いの話を。ユーザーが明確に出ない限り場面を変えない。',
    },
    openingLine: {
      en: 'Oh! Sorry — were you looking at this one too? It is kinder than the cover looks.',
      yue: '哎呀對唔住 — 你都睇緊呢本？封面凶啲，內容其實好溫柔。',
      zh: '啊抱歉 — 你也在看这本吗？封面凶一点，内容其实很温柔。',
      ja: 'あっごめん — これ、見てた？表紙より中身のほうが優しい本なんだ。',
    },
  },
  {
    id: 'beach-dusk',
    backgroundId: 'cloudsea',
    castGender: 'any',
    castPool: [
      'a14-vivi', 'a16-vita', 'a17-victoria-rubin', 'a64-lily-lily-animeit',
      'a70-vtuber-aihina-sample', 'a71-mary-sweety', 'a75-sorano', 'a81-cinna',
      'a468-eric',
    ],
    title: {
      en: 'Beach at dusk',
      yue: '黃昏沙灘',
      zh: '黄昏沙滩',
      ja: '黄昏のビーチ',
    },
    blurb: {
      en: 'Tide is low, sky is peach. Someone walks beside you along the wet sand — no rush, just the sea.',
      yue: '潮退、天色桃色。有人同你喺濕沙並排行 — 唔使趕，得個海。',
      zh: '退潮、桃色天空。有人和你在湿沙上并肩走 — 不着急，只有海。',
      ja: '潮がひいて、空は桃色。誰かと並んで濡れた砂を歩く — 急がなくていい、海だけ。',
    },
    systemBeat: {
      en: 'STORY MODE: You walk a quiet beach at dusk. Soft waves, peach sky, sandy feet. Keep the mood wholesome and unhurried. Stay on the shore unless the user clearly leaves.',
      yue: '故事模式：你喺黃昏靜沙灘行。細浪、桃色天、沙腳。保持溫馨唔趕時間。除非用戶明確離開，唔好換場。',
      zh: '故事模式：你在黄昏安静的沙滩上走。细浪、桃色天空、沙脚。保持温馨从容。除非用户明确离开，不要换场。',
      ja: 'ストーリーモード：黄昏の静かなビーチを歩いている。小さな波、桃色の空、砂の足。穏やかで急がない空気を保つ。ユーザーが明確に離れない限り場面を変えない。',
    },
    openingLine: {
      en: 'Want to walk a little farther? The water still holds the day\'s warmth.',
      yue: '再行遠啲？海水仲留住日頭嘅暖。',
      zh: '再走远一点？海水还留着白天的暖。',
      ja: 'もう少し歩かない？お水、まだ昼のぬくもり残ってる。',
    },
  },
];

export function storyById(id: string): StoryScene | undefined {
  return STORY_SCENES.find((s) => s.id === id);
}

export function resolveStoryCast(scene: StoryScene): string[] {
  const gender = scene.castGender ?? 'any';
  const out: string[] = [];
  for (const id of scene.castPool) {
    const c = characterById(id);
    if (c.id !== id) continue; // unknown / retired id fell back
    if (gender !== 'any' && c.gender !== gender) continue;
    out.push(c.id);
  }
  return out;
}

export type StoryRoll = {
  scene: StoryScene;
  characterId: string;
};

/** Pick a scene (optional fixed id) and a cast member from its pool. */
export function rollStory(opts?: { sceneId?: string; n?: number }): StoryRoll {
  const n = Math.abs(opts?.n ?? Date.now());
  const scene = (opts?.sceneId && storyById(opts.sceneId))
    || STORY_SCENES[n % STORY_SCENES.length]!;
  const pool = resolveStoryCast(scene);
  const fallback = scene.castPool[0] ?? 'a01-shino';
  const characterId = pool.length ? pool[n % pool.length]! : fallback;
  return { scene, characterId };
}
