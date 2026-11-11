'use client';
// Chat entry + idle "don't know" topic menu (Pixel chat-entry-flow).
// Suggestions only — weather/news/story play when the user picks or asks.

import type { Lang } from './prefs';

export type TopicId =
  | 'weather'
  | 'news'
  | 'story'
  | 'funFact'
  | 'funScience'
  | 'sing'
  | 'dance'
  | 'personal';

const ALL_TOPICS: TopicId[] = [
  'weather',
  'news',
  'story',
  'funFact',
  'funScience',
  'sing',
  'dance',
  'personal',
];

export const TOPIC_LABEL: Record<TopicId, Record<Lang, string>> = {
  weather: {
    en: 'weather near you',
    yue: '你附近天氣',
    zh: '你附近的天气',
    ja: 'そちらの天気',
  },
  news: {
    en: 'light local news',
    yue: '輕鬆本地新聞',
    zh: '轻松本地新闻',
    ja: 'ほっこり地元ニュース',
  },
  story: {
    en: 'a little story',
    yue: '講個小故事',
    zh: '讲个小故事',
    ja: '小さなお話',
  },
  funFact: {
    en: 'a fun fact',
    yue: '有趣冷知識',
    zh: '有趣冷知识',
    ja: '豆知識',
  },
  funScience: {
    en: 'fun science',
    yue: '輕鬆科學',
    zh: '轻松科学',
    ja: 'ゆるい科学',
  },
  sing: {
    en: 'sing together',
    yue: '一齊唱',
    zh: '一起唱',
    ja: '一緒に歌う',
  },
  dance: {
    en: 'dance together',
    yue: '一齊跳',
    zh: '一起跳',
    ja: '一緒に踊る',
  },
  personal: {
    en: 'whatever is on your mind',
    yue: '你心裏想講嘅嘢',
    zh: '你心里想说的',
    ja: 'いま話したいこと',
  },
};

const IDLE_MENU_LEAD: Record<Lang, string> = {
  en: 'No rush — pick anything that sounds fun:',
  yue: '唔使急，揀樣你鍾意嘅就得：',
  zh: '不用急，挑个你喜欢的就好：',
  ja: '急がなくていいよ。気になるものを選んでね：',
};

const UNDECIDED_LEAD: Record<Lang, string> = {
  en: "That's okay. We could try",
  yue: '冇問題呀，不如試下',
  zh: '没问题呀，不如试试',
  ja: '大丈夫だよ。じゃあ',
};

function asLang(lang?: string): Lang {
  if (lang === 'en' || lang === 'zh' || lang === 'ja' || lang === 'yue') return lang;
  return 'yue';
}

/** Deterministic pick of `count` topics (default 3) for menus. */
export function pickTopicSuggestions(lang: string, seed: number, count = 3): TopicId[] {
  const L = asLang(lang);
  void L;
  const n = Math.min(Math.max(count, 2), 3);
  const start = Math.abs(seed) % ALL_TOPICS.length;
  const out: TopicId[] = [];
  for (let i = 0; i < ALL_TOPICS.length && out.length < n; i++) {
    const id = ALL_TOPICS[(start + i) % ALL_TOPICS.length]!;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function formatTopicSuggestionLine(lang: string, topics: TopicId[], lead?: string): string {
  const L = asLang(lang);
  const labels = topics.map((id) => TOPIC_LABEL[id][L]);
  const head = lead?.trim() || IDLE_MENU_LEAD[L];
  if (L === 'en') return `${head} ${labels.join(', or ')}.`;
  if (L === 'ja') return `${head}${labels.join('、それか') }。`;
  if (L === 'zh') return `${head}${labels.join('、或者') }。`;
  return `${head}${labels.join('、或者') }。`;
}

export function undecidedTopicReply(lang: string, seed: number): string {
  const L = asLang(lang);
  return formatTopicSuggestionLine(lang, pickTopicSuggestions(lang, seed, 3), UNDECIDED_LEAD[L]);
}

const UNDECIDED_RE =
  /^(?:idk|i\s*don'?t\s*know|not\s*sure|no\s*idea|whatever|anything|um+|uh+|唔知|唔識揀|唔清楚|不知道|随便|不知道聊什么|何を話せば|わからない|何でもいい)[\s.!?，。！？]*$/i;

/** User idle / has no topic in mind. */
export function userUndecided(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 48) return false;
  return UNDECIDED_RE.test(t);
}

/** Story, science/fact, or simple problem-help — longer TTS / detailed mode. */
export function wantsLongCompanionReply(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Keep the regex self-contained (no client circular imports from long-talk).
  if (
    /(?:\bstory\b|tell\s+(?:me\s+)?a\s+story|bedtime\s+story|fun\s+fact|did\s+you\s+know|random\s+fact|fun\s+science|science\s+fact|why\s+is\s+(?:the\s+)?sky|explain\s+(?:the\s+)?science)|講個?故|故事|童話|冷知識|有趣知識|科學趣|豆知識|自然科学|讲个故|冷知识|科学趣味|お話して|物語|豆知識|面白い科学/i.test(t)
  ) {
    return true;
  }
  if (
    /(?:\bhow\s+(?:do\s+i|to|can\s+i)\b|\bhelp\s+me\s+(?:fix|reset|set\s*up|setup|connect|install|solve)\b|\b(?:won'?t|doesn'?t|not)\s+work(?:ing)?\b|\bfix\s+(?:my|the|this)\b)|點樣(?:整|搞|設)|怎么(?:整|搞|设)|怎麼辦|怎么办|搞唔掂|打不开/i.test(t)
  ) {
    return true;
  }
  return false;
}
