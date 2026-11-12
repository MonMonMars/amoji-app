'use client';
// Demo-phase chips above the chat composer — one-tap tutorials for what
// the character can do when the user would rather not talk or type (esp.
// iPhone). Labels stay short; each chip carries several prompt facets so
// repeat taps rotate content (weather: temp → forecast → wind, …).

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
  /**
   * Spoken/typed user lines fired on tap. Index 0 is the classic ask;
   * later indices rotate on repeat taps of the same chip.
   */
  prompts: Record<Lang, readonly string[]>;
};

/** First prompt for a lang — used by tests that only need the default ask. */
export function demoPhasePrimaryPrompt(btn: DemoPhaseButton, lang: Lang): string {
  return btn.prompts[lang][0] ?? '';
}

export const DEMO_PHASE_BUTTONS: readonly DemoPhaseButton[] = [
  {
    id: 'weather',
    label: { en: 'Weather', yue: '天氣', zh: '天气', ja: '天気' },
    prompts: {
      en: [
        "what's the weather here?",
        "what's the temperature right now?",
        "what's the forecast for the next few days?",
        "how's the wind today?",
        'how humid is it, and will it rain?',
      ],
      yue: [
        '今日天氣點呀？',
        '而家幾多度？',
        '未來幾日天氣預報點呀？',
        '今日風大唔大？',
        '濕度點，會唔會落雨？',
      ],
      zh: [
        '今天天气怎么样？',
        '现在多少度？',
        '未来几天天气预报怎么样？',
        '今天风大不大？',
        '湿度怎么样，会不会下雨？',
      ],
      ja: [
        '今日の天気は？',
        '今の気温は？',
        '今後数日の天気予報は？',
        '今日の風はどう？',
        '湿度と雨の予報は？',
      ],
    },
  },
  {
    id: 'news',
    label: { en: 'News', yue: '新聞', zh: '新闻', ja: 'ニュース' },
    prompts: {
      en: [
        "what's the latest news?",
        'any cheerful news today?',
        "what's happening in the world?",
        'any light local news?',
      ],
      yue: [
        '今日有咩新聞？',
        '有冇啲開心啲嘅新聞？',
        '世界而家有咩事？',
        '有冇啲輕鬆本地新聞？',
      ],
      zh: [
        '今天有什么新闻？',
        '有没有开心一点的新闻？',
        '世界上最近有什么事？',
        '有没有轻松本地新闻？',
      ],
      ja: [
        '最新ニュースは？',
        '明るいニュースある？',
        '世界で今なにが起きてる？',
        '地元の軽いニュースある？',
      ],
    },
  },
  {
    id: 'story',
    label: { en: 'Story', yue: '故事', zh: '故事', ja: 'お話' },
    prompts: {
      en: [
        showcaseStoryAsk('en'),
        'tell me a short fairy tale',
        'tell me a funny short story',
        'tell me a cozy bedtime story',
      ],
      yue: [
        showcaseStoryAsk('yue'),
        '講個短童話俾我聽',
        '講個搞笑短故仔俾我聽',
        '講個溫馨睡前故事俾我聽',
      ],
      zh: [
        showcaseStoryAsk('zh'),
        '讲个短童话给我听',
        '讲个搞笑短故事给我听',
        '讲个温馨睡前故事给我听',
      ],
      ja: [
        showcaseStoryAsk('ja'),
        '短い童話をひとつ話して',
        'おもしろい短い話をして',
        'やさしい寝る前のお話をして',
      ],
    },
  },
  {
    id: 'music',
    label: { en: 'Music', yue: '音樂', zh: '音乐', ja: '音楽' },
    prompts: {
      en: [
        'play some music',
        'play some jazz',
        'play some lofi music',
        'play some pop music',
      ],
      yue: [
        '播音樂',
        '播啲爵士樂',
        '播啲 lo-fi 音樂',
        '播啲流行音樂',
      ],
      zh: [
        '播音乐',
        '放点爵士乐',
        '放点 lo-fi 音乐',
        '放点流行音乐',
      ],
      ja: [
        '音楽をかけて',
        'ジャズをかけて',
        'ローファイ音楽をかけて',
        'ポップスをかけて',
      ],
    },
  },
  {
    id: 'dance',
    label: { en: 'Dance', yue: '跳舞', zh: '跳舞', ja: 'ダンス' },
    prompts: {
      en: [
        'dance for me',
        'dance to some jazz',
        'dance to upbeat pop',
        'dance to some electronic music',
      ],
      yue: [
        '跳支舞俾我睇',
        '跟住爵士樂跳支舞',
        '跟住輕快流行曲跳舞',
        '跟住電子音樂跳舞',
      ],
      zh: [
        '跳支舞给我看',
        '跟着爵士乐跳支舞',
        '跟着轻快流行曲跳舞',
        '跟着电子音乐跳舞',
      ],
      ja: [
        '踊って',
        'ジャズで踊って',
        'アップテンポのポップで踊って',
        'エレクトロニックで踊って',
      ],
    },
  },
  {
    id: 'sing',
    label: { en: 'Sing', yue: '唱歌', zh: '唱歌', ja: '歌う' },
    prompts: {
      en: [
        'sing a song',
        'sing a ballad',
        'sing something upbeat',
        'sing a pop song',
      ],
      yue: [
        '唱首歌俾我聽',
        '唱首慢歌俾我聽',
        '唱首輕快啲嘅歌',
        '唱首流行曲俾我聽',
      ],
      zh: [
        '唱首歌给我听',
        '唱首慢歌给我听',
        '唱首轻快点的歌',
        '唱首流行歌给我听',
      ],
      ja: [
        '歌を歌って',
        'バラードを歌って',
        '明るい曲を歌って',
        'ポップスを歌って',
      ],
    },
  },
  {
    id: 'funFact',
    label: { en: 'Fun fact', yue: '冷知識', zh: '冷知识', ja: '豆知識' },
    prompts: {
      en: [
        'tell me a fun fact',
        'tell me a weird animal fact',
        'tell me a space fun fact',
        'tell me a food fun fact',
      ],
      yue: [
        '講啲有趣冷知識俾我聽',
        '講啲奇怪動物冷知識',
        '講啲太空冷知識',
        '講啲食物冷知識',
      ],
      zh: [
        '讲个有趣冷知识给我听',
        '讲个奇怪的动物冷知识',
        '讲个太空冷知识',
        '讲个食物冷知识',
      ],
      ja: [
        '豆知識をひとつ教えて',
        '変な動物の豆知識を教えて',
        '宇宙の豆知識を教えて',
        '食べ物の豆知識を教えて',
      ],
    },
  },
  {
    id: 'yoga',
    label: { en: 'Yoga', yue: '瑜伽', zh: '瑜伽', ja: 'ヨガ' },
    prompts: {
      en: [
        "let's do yoga",
        'show me a yoga pose',
        'gentle yoga stretch please',
      ],
      yue: [
        '一齊做瑜伽',
        '教我一個瑜伽動作',
        '做吓輕柔瑜伽伸展',
      ],
      zh: [
        '一起做瑜伽',
        '教我一个瑜伽动作',
        '做点轻柔瑜伽伸展',
      ],
      ja: [
        'ヨガしよう',
        'ヨガのポーズをひとつ見せて',
        'やさしいヨガストレッチしよう',
      ],
    },
  },
  {
    id: 'kungfu',
    label: { en: 'Kung fu', yue: '功夫', zh: '功夫', ja: 'カンフー' },
    prompts: {
      en: [
        'show me kung fu',
        'teach me a kung fu move',
        'practice kung fu with me',
      ],
      yue: [
        '教我功夫啦',
        '教我一個功夫招式',
        '一齊練功夫',
      ],
      zh: [
        '教我功夫吧',
        '教我一个功夫招式',
        '一起练功夫',
      ],
      ja: [
        'カンフー見せて',
        'カンフーの技をひとつ教えて',
        '一緒にカンフーしよう',
      ],
    },
  },
  {
    id: 'taichi',
    label: { en: 'Tai chi', yue: '太極', zh: '太极', ja: '太極' },
    prompts: {
      en: [
        "let's do tai chi",
        'show me a tai chi move',
        'slow tai chi practice please',
      ],
      yue: [
        '一齊打太極',
        '教我一個太極動作',
        '慢慢打套太極',
      ],
      zh: [
        '一起打太极',
        '教我一个太极动作',
        '慢慢打套太极',
      ],
      ja: [
        '太極しよう',
        '太極の動きをひとつ見せて',
        'ゆっくり太極しよう',
      ],
    },
  },
  {
    id: 'stretch',
    label: { en: 'Stretch', yue: '伸展', zh: '伸展', ja: 'ストレッチ' },
    prompts: {
      en: [
        "let's warm up",
        "let's stretch our arms",
        'a quick warm-up stretch please',
      ],
      yue: [
        '一齊熱身',
        '一齊伸展吓手臂',
        '做吓快速熱身伸展',
      ],
      zh: [
        '一起热身',
        '一起伸展一下手臂',
        '做个快速热身伸展',
      ],
      ja: [
        'ストレッチしよう',
        '腕をストレッチしよう',
        'さっとストレッチしよう',
      ],
    },
  },
  {
    id: 'jog',
    label: { en: 'Jog', yue: '慢跑', zh: '慢跑', ja: 'ジョギング' },
    prompts: {
      en: [
        "let's go jogging",
        "let's jog in place",
        'a short jogging warm-up please',
      ],
      yue: [
        '一齊慢跑',
        '原地慢跑吓',
        '短短慢跑熱身吓',
      ],
      zh: [
        '一起慢跑',
        '原地慢跑一下',
        '短短慢跑热身一下',
      ],
      ja: [
        'ジョギングしよう',
        'その場ジョギングしよう',
        '少しジョギングしよう',
      ],
    },
  },
  {
    id: 'eat',
    label: { en: 'Eat', yue: '一齊食', zh: '一起吃', ja: '一緒に食' },
    prompts: {
      en: [
        'eat with me',
        'have dinner with me',
        'eat with me — something sweet',
      ],
      yue: [
        '一齊食飯喇',
        '陪我食晚餐喇',
        '一齊食啲甜品喇',
      ],
      zh: [
        '陪我吃饭吧',
        '陪我吃晚餐吧',
        '一起吃点甜的吧',
      ],
      ja: [
        'ごはん一緒に食べよう',
        '晩ごはん一緒に食べよう',
        '甘いもの一緒に食べよう',
      ],
    },
  },
  {
    id: 'piano',
    label: { en: 'Piano', yue: '鋼琴', zh: '钢琴', ja: 'ピアノ' },
    prompts: {
      en: [
        'play the piano',
        'play a soft piano piece',
        'play something bright on piano',
      ],
      yue: [
        '彈鋼琴俾我聽',
        '彈首柔和鋼琴曲',
        '彈首輕快活潑嘅鋼琴曲',
      ],
      zh: [
        '弹钢琴给我听',
        '弹首柔和钢琴曲',
        '弹首轻快活泼的钢琴曲',
      ],
      ja: [
        'ピアノを弾いて',
        'やさしいピアノ曲を弾いて',
        '明るいピアノ曲を弾いて',
      ],
    },
  },
  {
    id: 'violin',
    label: { en: 'Violin', yue: '小提琴', zh: '小提琴', ja: 'バイオリン' },
    prompts: {
      en: [
        'play the violin',
        'play a gentle violin piece',
        'play something lively on violin',
      ],
      yue: [
        '拉小提琴俾我聽',
        '拉首溫柔小提琴曲',
        '拉首活潑小提琴曲',
      ],
      zh: [
        '拉小提琴给我听',
        '拉首温柔小提琴曲',
        '拉首活泼小提琴曲',
      ],
      ja: [
        'バイオリンを弾いて',
        'やさしいバイオリン曲を弾いて',
        '元気なバイオリン曲を弾いて',
      ],
    },
  },
  {
    id: 'duet',
    label: { en: 'Duet', yue: '合唱', zh: '合唱', ja: 'デュエット' },
    prompts: {
      en: [
        'sing with me',
        'sing along with me',
        'duet with me',
      ],
      yue: [
        '一齊唱歌',
        '同我一齊唱',
        '陪我合唱一首',
      ],
      zh: [
        '陪我唱歌',
        '和我一起唱',
        '陪我合唱一首',
      ],
      ja: [
        '一緒に歌おう',
        'ハモって一緒に歌おう',
        'デュエットしよう',
      ],
    },
  },
  {
    id: 'funScience',
    label: { en: 'Science', yue: '科學', zh: '科学', ja: '科学' },
    prompts: {
      en: [
        'tell me some fun science',
        'explain a fun science fact about water',
        'tell me fun science about the sky',
        'explain fun science about animals',
      ],
      yue: [
        '講啲科學趣聞俾我聽',
        '用科學趣味講吓水',
        '講吓天空嘅科學趣聞',
        '講吓動物嘅科學趣聞',
      ],
      zh: [
        '讲点科学趣味给我听',
        '用科学趣味讲讲水',
        '讲讲天空的科学趣味',
        '讲讲动物的科学趣味',
      ],
      ja: [
        '面白い科学を教えて',
        '水の面白い科学を教えて',
        '空の面白い科学を教えて',
        '動物の面白い科学を教えて',
      ],
    },
  },
  {
    id: 'tag',
    label: { en: 'Tag', yue: '捉人', zh: '捉人', ja: '鬼ごっこ' },
    prompts: {
      en: [
        'play tag',
        'play tag with me',
        'tag game — catch me',
      ],
      yue: [
        '玩捉人',
        '同我玩捉人',
        '玩捉人遊戲啦',
      ],
      zh: [
        '玩捉人游戏',
        '和我玩捉人',
        '来玩捉人游戏',
      ],
      ja: [
        '捕まえて',
        '鬼ごっこしよう',
        '捕まえて遊ぼう',
      ],
    },
  },
];

export function asDemoLang(lang?: string): Lang {
  if (lang === 'en' || lang === 'zh' || lang === 'ja' || lang === 'yue') return lang;
  return 'yue';
}

/** Rotate through prompt facets: tap 0 → first ask, tap 1 → next facet, … */
export function demoPhasePrompt(id: DemoPhaseId, lang?: string, n = 0): string {
  const L = asDemoLang(lang);
  const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === id);
  const bank = btn?.prompts[L] ?? [];
  if (!bank.length) return '';
  return bank[Math.abs(n) % bank.length] ?? bank[0] ?? '';
}

export function demoPhasePromptCount(id: DemoPhaseId, lang?: string): number {
  const L = asDemoLang(lang);
  const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === id);
  return btn?.prompts[L]?.length ?? 0;
}

export function demoPhaseLabel(id: DemoPhaseId, lang?: string): string {
  const L = asDemoLang(lang);
  const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === id);
  return btn?.label[L] ?? id;
}
