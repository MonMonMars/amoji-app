'use client';
// Demo-phase chips above the chat composer — one-tap tutorials for what
// the character can do when the user would rather not talk or type (esp.
// iPhone). Labels stay short; `prompt` is a real user line that ChatPanel
// already knows how to answer (live weather/news, show, dance, sing…).

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
  | 'yoga';

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
