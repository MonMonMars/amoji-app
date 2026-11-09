'use client';
// Demo-phase chips above the chat composer — one-tap tutorials for what
// the character can do when the user would rather not talk or type (esp.
// iPhone). Labels stay short; `prompt` is a real user line that ChatPanel
// already knows how to answer (live weather/news, show, dance, sing,
// trainer lessons, instruments, meals, duets, mini-games…).

import type { Lang } from './prefs';
import { showcaseStoryAsk } from './showcase';

export type DemoPhaseId =
  | 'weather'
  | 'news'
  | 'story'
  | 'music'
  | 'dance'
  | 'sing'
  | 'funFact'
  | 'yoga'
  | 'kungfu'
  | 'taichi'
  | 'stretch'
  | 'jog'
  | 'eat'
  | 'piano'
  | 'violin'
  | 'duet'
  | 'funScience'
  | 'tag';

export type DemoPhaseButton = {
  id: DemoPhaseId;
  /** Tiny chip label — keep ≤ ~6 CJK / ~10 Latin chars. */
  label: Record<Lang, string>;
  /** Spoken/typed user line fired on tap. */
  prompt: Record<Lang, string>;
};

export const DEMO_PHASE_BUTTONS: readonly DemoPhaseButton[] = [
  {
    id: 'weather',
    label: { en: 'Weather', yue: '天氣', zh: '天气', ja: '天気' },
    prompt: {
      en: "what's the weather here?",
      yue: '今日天氣點呀？',
      zh: '今天天气怎么样？',
      ja: '今日の天気は？',
    },
  },
  {
    id: 'news',
    label: { en: 'News', yue: '新聞', zh: '新闻', ja: 'ニュース' },
    prompt: {
      en: "what's the latest news?",
      yue: '今日有咩新聞？',
      zh: '今天有什么新闻？',
      ja: '最新ニュースは？',
    },
  },
  {
    id: 'story',
    label: { en: 'Story', yue: '故事', zh: '故事', ja: 'お話' },
    prompt: {
      en: showcaseStoryAsk('en'),
      yue: showcaseStoryAsk('yue'),
      zh: showcaseStoryAsk('zh'),
      ja: showcaseStoryAsk('ja'),
    },
  },
  {
    id: 'music',
    label: { en: 'Music', yue: '音樂', zh: '音乐', ja: '音楽' },
    prompt: {
      en: 'play some music',
      yue: '播音樂',
      zh: '播音乐',
      ja: '音楽をかけて',
    },
  },
  {
    id: 'dance',
    label: { en: 'Dance', yue: '跳舞', zh: '跳舞', ja: 'ダンス' },
    prompt: {
      en: 'dance for me',
      yue: '跳支舞俾我睇',
      zh: '跳支舞给我看',
      ja: '踊って',
    },
  },
  {
    id: 'sing',
    label: { en: 'Sing', yue: '唱歌', zh: '唱歌', ja: '歌う' },
    prompt: {
      en: 'sing a song',
      yue: '唱首歌俾我聽',
      zh: '唱首歌给我听',
      ja: '歌を歌って',
    },
  },
  {
    id: 'funFact',
    label: { en: 'Fun fact', yue: '冷知識', zh: '冷知识', ja: '豆知識' },
    prompt: {
      en: 'tell me a fun fact',
      yue: '講啲有趣冷知識俾我聽',
      zh: '讲个有趣冷知识给我听',
      ja: '豆知識をひとつ教えて',
    },
  },
  {
    id: 'yoga',
    label: { en: 'Yoga', yue: '瑜伽', zh: '瑜伽', ja: 'ヨガ' },
    prompt: {
      en: "let's do yoga",
      yue: '一齊做瑜伽',
      zh: '一起做瑜伽',
      ja: 'ヨガしよう',
    },
  },
  {
    id: 'kungfu',
    label: { en: 'Kung fu', yue: '功夫', zh: '功夫', ja: 'カンフー' },
    prompt: {
      en: 'show me kung fu',
      yue: '教我功夫啦',
      zh: '教我功夫吧',
      ja: 'カンフー見せて',
    },
  },
  {
    id: 'taichi',
    label: { en: 'Tai chi', yue: '太極', zh: '太极', ja: '太極' },
    prompt: {
      en: "let's do tai chi",
      yue: '一齊打太極',
      zh: '一起打太极',
      ja: '太極しよう',
    },
  },
  {
    id: 'stretch',
    label: { en: 'Stretch', yue: '伸展', zh: '伸展', ja: 'ストレッチ' },
    prompt: {
      en: "let's warm up",
      yue: '一齊熱身',
      zh: '一起热身',
      ja: 'ストレッチしよう',
    },
  },
  {
    id: 'jog',
    label: { en: 'Jog', yue: '慢跑', zh: '慢跑', ja: 'ジョギング' },
    prompt: {
      en: "let's go jogging",
      yue: '一齊慢跑',
      zh: '一起慢跑',
      ja: 'ジョギングしよう',
    },
  },
  {
    id: 'eat',
    label: { en: 'Eat', yue: '一齊食', zh: '一起吃', ja: '一緒に食' },
    prompt: {
      en: 'eat with me',
      yue: '一齊食飯喇',
      zh: '陪我吃饭吧',
      ja: 'ごはん一緒に食べよう',
    },
  },
  {
    id: 'piano',
    label: { en: 'Piano', yue: '鋼琴', zh: '钢琴', ja: 'ピアノ' },
    prompt: {
      en: 'play the piano',
      yue: '彈鋼琴俾我聽',
      zh: '弹钢琴给我听',
      ja: 'ピアノを弾いて',
    },
  },
  {
    id: 'violin',
    label: { en: 'Violin', yue: '小提琴', zh: '小提琴', ja: 'バイオリン' },
    prompt: {
      en: 'play the violin',
      yue: '拉小提琴俾我聽',
      zh: '拉小提琴给我听',
      ja: 'バイオリンを弾いて',
    },
  },
  {
    id: 'duet',
    label: { en: 'Duet', yue: '合唱', zh: '合唱', ja: 'デュエット' },
    prompt: {
      en: 'sing with me',
      yue: '一齊唱歌',
      zh: '陪我唱歌',
      ja: '一緒に歌おう',
    },
  },
  {
    id: 'funScience',
    label: { en: 'Science', yue: '科學', zh: '科学', ja: '科学' },
    prompt: {
      en: 'tell me some fun science',
      yue: '講啲科學趣聞俾我聽',
      zh: '讲点科学趣味给我听',
      ja: '面白い科学を教えて',
    },
  },
  {
    id: 'tag',
    label: { en: 'Tag', yue: '捉人', zh: '捉人', ja: '鬼ごっこ' },
    prompt: {
      en: 'play tag',
      yue: '玩捉人',
      zh: '玩捉人游戏',
      ja: '捕まえて',
    },
  },
];

export function asDemoLang(lang?: string): Lang {
  if (lang === 'en' || lang === 'zh' || lang === 'ja' || lang === 'yue') return lang;
  return 'yue';
}

export function demoPhasePrompt(id: DemoPhaseId, lang?: string): string {
  const L = asDemoLang(lang);
  const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === id);
  return btn?.prompt[L] ?? '';
}

export function demoPhaseLabel(id: DemoPhaseId, lang?: string): string {
  const L = asDemoLang(lang);
  const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === id);
  return btn?.label[L] ?? id;
}
