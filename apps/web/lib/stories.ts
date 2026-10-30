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
      'a16-vita', 'a74-mizuka', 'a77-sasha',
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
