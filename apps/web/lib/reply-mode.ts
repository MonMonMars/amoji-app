// Reply-mode chart: mode → { targetLength, emotion, talkVsMusic }.
//
// One place for LLM length + emotion directives. Detection folds user intent,
// optional demo-phase chip ids, live weather/news world blocks, and music/sing
// asks. Music/sing/dance = very short spoken intro; long playback stays on
// beginShow / performance-intro — never paste lyric banks into the reply.
//
// Chart (summary):
//   casual      → very_short · warm contentment · talk_only
//   joke/poem   → short/medium · playful joy · talk_only
//   personal    → short · tender warmth · talk_only
//   weather     → short · caring calm · tool_spoken_facts
//   news        → long · warm interest · tool_spoken_facts (headline+lede+details)
//   help/recipe → medium–long · calm encouragement · talk_only
//   story       → super_long · love/wonder (warm, unhurried) · talk_only
//   science     → super_long · curious pride · talk_only
//   music       → very_short talk + long clip · joy/excitement · short_talk_long_music

import { resolveMusicAsk } from './music-ask';
import { userAsksForRecipe } from './recipe-reply';
import {
  DEFAULT_CHAT_MAX_TOKENS,
  DETAILED_RECIPE_MAX_TOKENS,
  detectLongTalkKind,
  HELP_MAX_TOKENS,
  longTalkSystemBlock,
  SCIENCE_MAX_TOKENS,
  type LongTalkHints,
  type LongTalkKind,
} from './long-talk';
import { STORY_MAX_TOKENS } from './story-reply';

export type ReplyModeId =
  | 'casual'
  | 'story'
  | 'science'
  | 'help'
  | 'news'
  | 'weather'
  | 'music'
  | 'recipe'
  | 'poem'
  | 'joke'
  | 'personal';

/** Spoken prose budget the model must follow. */
export type TargetLength = 'very_short' | 'short' | 'medium' | 'long' | 'super_long';

/**
 * talk_only — prose is the whole turn.
 * short_talk_long_music — one short intro; audio/clip owns the long play.
 * tool_spoken_facts — live weather/news facts; statement-only, no soft invites.
 */
export type TalkVsMusic = 'talk_only' | 'short_talk_long_music' | 'tool_spoken_facts';

export interface ReplyModeBudget {
  id: ReplyModeId;
  targetLength: TargetLength;
  /** Dominant feelings for the closing [emotion:{...}] line. */
  emotion: string;
  talkVsMusic: TalkVsMusic;
  /** Sentence guide embedded in the system addendum. */
  sentenceGuide: string;
  maxTokens: number;
  /** Skip reply-shape short trim / allow multi-beat. */
  detailed: boolean;
  /** When set, also append the richer long-talk structure block. */
  longTalkKind?: LongTalkKind;
}

/** Canonical chart — tests assert this table. */
export const REPLY_MODE_CHART: Readonly<Record<ReplyModeId, ReplyModeBudget>> = {
  casual: {
    id: 'casual',
    targetLength: 'very_short',
    emotion: 'contentment + warmth',
    talkVsMusic: 'talk_only',
    sentenceGuide: '1–2 cozy sentences',
    maxTokens: DEFAULT_CHAT_MAX_TOKENS,
    detailed: false,
  },
  joke: {
    id: 'joke',
    targetLength: 'short',
    emotion: 'joy + playfulness',
    talkVsMusic: 'talk_only',
    sentenceGuide: '1–3 spoken sentences (setup → punch)',
    maxTokens: DEFAULT_CHAT_MAX_TOKENS,
    detailed: false,
  },
  personal: {
    id: 'personal',
    targetLength: 'short',
    emotion: 'love + tenderness',
    talkVsMusic: 'talk_only',
    sentenceGuide: '1–3 soft sentences',
    maxTokens: DEFAULT_CHAT_MAX_TOKENS,
    detailed: false,
  },
  poem: {
    id: 'poem',
    targetLength: 'medium',
    emotion: 'contentment + wonder',
    talkVsMusic: 'talk_only',
    sentenceGuide: 'a short poem (~4–8 lines) then one soft beat',
    maxTokens: 360,
    detailed: true,
  },
  weather: {
    id: 'weather',
    targetLength: 'short',
    emotion: 'contentment + care',
    talkVsMusic: 'tool_spoken_facts',
    sentenceGuide: '1–2 finished statements from live weather facts',
    maxTokens: DEFAULT_CHAT_MAX_TOKENS,
    detailed: false,
  },
  news: {
    id: 'news',
    targetLength: 'long',
    emotion: 'interest + warmth',
    talkVsMusic: 'tool_spoken_facts',
    sentenceGuide: 'headline + short lede + 2–4 key details as finished statements — no fishing questions, no inventing',
    maxTokens: HELP_MAX_TOKENS,
    detailed: true,
  },
  help: {
    id: 'help',
    targetLength: 'long',
    emotion: 'calm + encouragement',
    talkVsMusic: 'talk_only',
    sentenceGuide: '4–8 sentences with 2–5 clear steps',
    maxTokens: HELP_MAX_TOKENS,
    detailed: true,
    longTalkKind: 'help',
  },
  recipe: {
    id: 'recipe',
    targetLength: 'long',
    emotion: 'joy + encouragement',
    talkVsMusic: 'talk_only',
    sentenceGuide: 'ingredients + numbered steps in this turn',
    maxTokens: DETAILED_RECIPE_MAX_TOKENS,
    detailed: true,
  },
  story: {
    id: 'story',
    targetLength: 'super_long',
    emotion: 'love + wonder + contentment',
    talkVsMusic: 'talk_only',
    sentenceGuide:
      '12–22 sentences across 3–5 paragraphs — full emotional arc with dialogue and sensory detail, not a short summary',
    maxTokens: STORY_MAX_TOKENS,
    detailed: true,
    longTalkKind: 'story',
  },
  science: {
    id: 'science',
    targetLength: 'super_long',
    emotion: 'curiosity + pride',
    talkVsMusic: 'talk_only',
    sentenceGuide: '4–8+ teaching sentences (fact → why → everyday example)',
    maxTokens: SCIENCE_MAX_TOKENS,
    detailed: true,
    longTalkKind: 'science',
  },
  music: {
    id: 'music',
    targetLength: 'very_short',
    emotion: 'joy + excitement',
    talkVsMusic: 'short_talk_long_music',
    sentenceGuide: 'ONE short spoken intro only — never paste lyrics',
    maxTokens: 120,
    detailed: false,
  },
} as const;

export type ReplyModeHints = LongTalkHints & {
  /** Demo-phase chip id when the turn came from a chip tap. */
  demoPhaseId?: string;
  /** Live facts block (Weather / Light news / …). */
  world?: string;
  /** ChatPanel already matched a music/sing/dance ask. */
  musicMatched?: boolean;
};

const WEATHER_ASK_RE =
  /\b(weather|forecast|temperature|degrees?|wind|humid(?:ity)?|raining|rain|snow|umbrella)\b|天氣|天气|落雨|下雨|幾多度|多少度|氣溫|気温|預報|预报|天気|気温|予報/i;

const NEWS_ASK_RE =
  /\b(news|headlines|what's happening|what is happening|AI\s+news)\b|新聞|新闻|頭條|头条|ニュース|見出し|AI新聞|AI新闻|AIニュース/i;

const JOKE_ASK_RE =
  /\b(?:tell\s+(?:me\s+)?(?:a\s+)?(?:joke|funny)|clean\s+joke|make\s+me\s+laugh)\b|講个?笑话|讲个?笑话|講笑话|讲笑话|講笑话俾我|講個笑话|ジョーク|冗談/i;

const POEM_ASK_RE =
  /\b(?:(?:write|read|recite|tell)\s+(?:me\s+)?(?:a\s+)?(?:short\s+)?poem|haiku)\b|小詩|小诗|念诗|念詩|作詩|作诗|詩を|ポエム/i;

const PERSONAL_ASK_RE =
  /\b(?:something\s+personal|little\s+secret|on\s+your\s+mind|whisper)\b|心里话|心裡話|悄悄話|悄悄话|秘密話|傾下偈|聊聊心事/i;

/** Demo-phase chip → reply mode (string ids; avoid importing demo-phase). */
export const DEMO_PHASE_TO_REPLY_MODE: Readonly<Record<string, ReplyModeId>> = {
  weather: 'weather',
  news: 'news',
  aiNews: 'news',
  personalTalk: 'personal',
  secretTalk: 'personal',
  joke: 'joke',
  poem: 'poem',
  tip: 'help',
  story: 'story',
  music: 'music',
  dance: 'music',
  sing: 'music',
  funFact: 'science',
  funScience: 'science',
  yoga: 'music',
  kungfu: 'music',
  taichi: 'music',
  stretch: 'music',
  jog: 'music',
  eat: 'casual',
  piano: 'music',
  violin: 'music',
  duet: 'music',
  tag: 'casual',
};

function modeFromWorld(world?: string): ReplyModeId | null {
  if (!world?.trim()) return null;
  if (/^Weather\b/m.test(world) || /\bWeather\s*:/i.test(world)) return 'weather';
  if (/\b(?:Light news|Recent news|News)\s*:/i.test(world)) return 'news';
  if (/\b(?:Recipe|Learn)\s*:/i.test(world)) return 'recipe';
  return null;
}

/**
 * Resolve the reply-mode chart row for this turn.
 * Priority: music → story → science → help → recipe → weather → news →
 * poem/joke/personal → demo-phase → casual.
 */
export function resolveReplyMode(lastUser: string, hints?: ReplyModeHints): ReplyModeBudget {
  const t = lastUser.trim();
  const musicHit = hints?.musicMatched || resolveMusicAsk(t).matched;
  if (musicHit) return REPLY_MODE_CHART.music;

  const longKind = detectLongTalkKind(t, hints);
  if (longKind === 'story') return REPLY_MODE_CHART.story;
  if (longKind === 'science') return REPLY_MODE_CHART.science;
  if (longKind === 'help') return REPLY_MODE_CHART.help;

  if (userAsksForRecipe(t) || /\b(?:Recipe|Learn)\s*:/i.test(hints?.world ?? '')) {
    return REPLY_MODE_CHART.recipe;
  }

  const fromWorld = modeFromWorld(hints?.world);
  if (fromWorld === 'weather' || WEATHER_ASK_RE.test(t)) return REPLY_MODE_CHART.weather;
  if (fromWorld === 'news' || NEWS_ASK_RE.test(t)) return REPLY_MODE_CHART.news;
  if (fromWorld === 'recipe') return REPLY_MODE_CHART.recipe;

  if (POEM_ASK_RE.test(t)) return REPLY_MODE_CHART.poem;
  if (JOKE_ASK_RE.test(t)) return REPLY_MODE_CHART.joke;
  if (PERSONAL_ASK_RE.test(t)) return REPLY_MODE_CHART.personal;

  const demoId = hints?.demoPhaseId?.trim();
  if (demoId && DEMO_PHASE_TO_REPLY_MODE[demoId]) {
    return REPLY_MODE_CHART[DEMO_PHASE_TO_REPLY_MODE[demoId]!];
  }

  return REPLY_MODE_CHART.casual;
}

function channelLine(mode: ReplyModeBudget, yue: boolean): string {
  if (mode.talkVsMusic === 'short_talk_long_music') {
    return yue
      ? '頻道：短講 + 長播 — 只講一句簡短介紹（歌名／曲風），唔好貼歌詞或長篇解說；長音樂／表演由播放路徑負責。'
      : 'CHANNEL: short talk + long music — ONE short spoken intro (title/style only). Do NOT paste lyrics or a long monologue; the long play is the audio/clip path.';
  }
  if (mode.talkVsMusic === 'tool_spoken_facts') {
    return yue
      ? '頻道：即時事實 — 用完整陳述讀出天氣／新聞，唔好追問、唔好邀請跳舞唱歌。'
      : 'CHANNEL: tool facts — read weather/news as finished statements. No fishing questions, no dance/sing invites.';
  }
  return yue
    ? '頻道：純傾偈 — 用說話完成呢一轉；唔好順便推音樂／舞蹈。'
    : 'CHANNEL: talk only — finish this turn in spoken words; do not bolt music/dance on.';
}

function lengthLine(mode: ReplyModeBudget, yue: boolean): string {
  const tag = mode.targetLength.toUpperCase();
  if (yue) {
    return `長度（${tag}）：${mode.sentenceGuide}。${
      mode.detailed ? '呢轉唔使跟「48字 / 1–3句」上限。' : '保持極短，唔好演講。'
    }`;
  }
  return `LENGTH (${tag}): ${mode.sentenceGuide}. ${
    mode.detailed
      ? 'This turn overrides the default 1–3 sentence cap.'
      : 'Stay tight — never a speech.'
  }`;
}

function emotionLine(mode: ReplyModeBudget, yue: boolean): string {
  if (yue) {
    return `情緒：偏向 ${mode.emotion} — 最後一行 [emotion:{...}] 用 0.7–1.0 加重真實感受。`;
  }
  return `EMOTION: lean ${mode.emotion} — weight the final [emotion:{...}] line 0.7–1.0 on those feelings.`;
}

/**
 * Concise LLM addendum from the chart. Statement-only / no soft-invite policy
 * for tool facts and music intros is restated here so free models see it late.
 */
export function replyModeSystemBlock(mode: ReplyModeBudget, language?: string): string {
  const yue = language === 'yue';
  const head = yue
    ? `REPLY MODE / 回覆模式：${mode.id}`
    : `REPLY MODE: ${mode.id}`;
  const lines = [
    head,
    `- ${lengthLine(mode, yue)}`,
    `- ${emotionLine(mode, yue)}`,
    `- ${channelLine(mode, yue)}`,
  ];
  if (mode.id === 'music') {
    lines.push(
      yue
        ? '- 音樂／唱歌／跳舞：介紹完即停；唔好背歌詞、唔好再問想唔想聽第二首。'
        : '- Music/sing/dance: stop after the intro. Never recite lyrics; never ask if they want another song.',
    );
  }
  if (mode.talkVsMusic === 'tool_spoken_facts') {
    lines.push(
      yue
        ? '- 仍然遵守：只陳述、唔軟邀請、唔追問下一題。'
        : '- Still policy: statement-only — no soft invites, no follow-up interviews.',
    );
  }
  if (mode.id === 'news') {
    lines.push(
      yue
        ? '- 新聞：讀標題 + 摘要／導語 + 2–4 個重點；唔好只讀一行標題，亦唔好發明事實或重讀舊聞。'
        : '- News: read the headline, then the summary/lede, then 2–4 key details. Never a one-liner title alone; never invent facts or re-read an older story.',
    );
  }
  let block = lines.join('\n');
  if (mode.longTalkKind) {
    block += `\n${longTalkSystemBlock(mode.longTalkKind, language)}`;
  }
  return block;
}

/** Token budget from the chart (detailed recipe flag kept for legacy call sites). */
export function maxTokensForReplyMode(mode: ReplyModeBudget, detailedRecipe = false): number {
  if (mode.id !== 'casual') return mode.maxTokens;
  if (detailedRecipe) return DETAILED_RECIPE_MAX_TOKENS;
  return mode.maxTokens;
}
