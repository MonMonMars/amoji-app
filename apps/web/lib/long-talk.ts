'use client';
// Long companion turns for story, science/facts, and simple problem-help.
// Default chat stays 1–3 cozy sentences (reply-shape + BASE_SYSTEM). These
// modes raise max_tokens, skip the short trim, and inject mode-specific
// system addenda. Crisis stays handled upstream in ChatPanel before chat.

import {
  STORY_MAX_TOKENS,
  storySystemBlock,
  wantsStoryTurn,
  type StoryTurnHints,
} from './story-reply';

export type LongTalkKind = 'story' | 'science' | 'help';

export const SCIENCE_MAX_TOKENS = 768;
export const HELP_MAX_TOKENS = 640;
export const DETAILED_RECIPE_MAX_TOKENS = 520;
export const DEFAULT_CHAT_MAX_TOKENS = 280;

/** Fun fact / science ask — accurate, multi-beat teaching (not one-liners). */
const SCIENCE_ASK_RE =
  /(?:\bfun\s+(?:science|fact)\b|\bscience\s+fact\b|\brandom\s+fact\b|\bdid\s+you\s+know\b|\btrivia\b|\bexplain\s+(?:the\s+)?science\b|\bwhy\s+is\s+(?:the\s+)?sky\b|\bwhy\s+(?:is|are|do|does|did)\s+(?:the\s+)?(?:sky|sun|moon|earth|ocean|rain|rainbow|stars?|planets?|gravity|magnet|plant|tree|body|brain|blood|heart)\b|\bhow\s+does\s+(?:the\s+)?(?:sky|sun|moon|earth|body|brain|plant|tree|water|ocean|atom|gravity|magnet|photosynthesis)\b|\bwhat\s+(?:is|are)\s+(?:a\s+|an\s+|the\s+)?(?:gravity|atom|molecule|photosynthesis|black\s+hole|dinosaur|planet|galaxy|neuron|virus|bacteria|eclipse|constellation)\b)/i;

const SCIENCE_ASK_CJK =
  /(?:冷知識|冷知识|有趣知識|有趣知识|豆知識|豆知识|科學趣|科学趣味|轻松科学|ゆるい科学|自然科学|有趣科學|講啲科學|讲点科学|面白い科学|點解天|为什么天空|為什麼天空|天空(?:點解|为什么|為什麼)|光合作用|重力|黑洞|恐龍|恐龙|原子|分子)/;

/** Practical how-to / simple troubleshooting — not crisis, not pure emotion. */
const HELP_ASK_RE =
  /(?:\bhow\s+(?:do\s+i|to|can\s+i)\b|\bhelp\s+me\s+(?:fix|reset|set\s*up|setup|connect|install|solve|debug|troubleshoot|change|update|remove|uninstall|pair|configure)\b|\b(?:won'?t|will\s+not|doesn'?t|does\s+not|not)\s+work(?:ing)?\b|\b(?:is\s+)?broken\b|\berror\s+(?:code|message)?\b|\bstuck\s+on\b|\btroubleshoot(?:ing)?\b|\bfix\s+(?:my|the|this)\b|\bmy\s+\w+\s+(?:won'?t|doesn'?t|isn'?t|keeps)\b)/i;

const HELP_ASK_CJK =
  /(?:點樣(?:整|搞|設|連|裝|重設|重置)|怎么(?:整|搞|设|连|装|重设|重置)|怎麼(?:整|搞|設|連|裝|重設|重置)|怎麼辦|怎么办|搞唔掂|打不开|連唔到|连不上|修好|教我(?:修|整|搞|設)|设置一下|設定一下|配对|配對)/;

export function userWantsScience(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  return SCIENCE_ASK_RE.test(t) || SCIENCE_ASK_CJK.test(t);
}

export function userWantsHelp(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  // Pure "help me" / emotional support stays short companion chat.
  if (/^(?:help(?:\s+me)?|幫幫我|帮帮我|助けて)[\s.!?，。！？…]*$/i.test(t)) return false;
  // Dance / sing performance asks keep showcase motion — not troubleshooting tone.
  if (/\b(?:danc(?:e|ing)|sing(?:ing)?|karaoke)\b|跳舞|唱歌|ダンス|踊っ|歌って/i.test(t)
    && !/\b(?:fix|reset|connect|install|broken|error|won'?t\s+work)\b|搞唔掂|打不开/i.test(t)) {
    return false;
  }
  return HELP_ASK_RE.test(t) || HELP_ASK_CJK.test(t);
}

export type LongTalkHints = StoryTurnHints;

/** Priority: story → science → help. Idle chitchat returns null. */
export function detectLongTalkKind(lastUser: string, hints?: LongTalkHints): LongTalkKind | null {
  if (wantsStoryTurn(lastUser, hints)) return 'story';
  if (userWantsScience(lastUser)) return 'science';
  if (userWantsHelp(lastUser)) return 'help';
  return null;
}

export function scienceSystemBlock(language?: string): string {
  const yue = language === 'yue';
  if (yue) {
    return `SCIENCE / FUN-FACT TURN (overrides the short-reply rules above):
- 呢個係科學或冷知識 — 唔使跟住「48字 / 1–3句」上限。
- 用清楚口語粵語教：先講事實，再講點解，再加一個生活例子；大約 4–8 句，可以分兩段。
- 要準確：唔知就直認，唔好編數據或假研究。仍然用口語粒子，唔好 markdown。
- 可以留一句溫柔跟進，但唔使硬追問。照舊最後一行 [emotion:{...}]。`;
  }
  return `SCIENCE / FUN-FACT TURN (overrides the short-reply rules above):
- Teach a real science fact or fun fact warmly — about 4–8 spoken sentences (two short beats OK).
- Structure: clear fact → why it works (simple mechanism) → one vivid everyday example. Stay accurate; if unsure, say so — never invent numbers, studies, or jargon you cannot explain simply.
- No markdown lists unless they asked for steps. Kid-safe and encouraging. Still end with one line: [emotion:{...}].`;
}

export function helpSystemBlock(language?: string): string {
  const yue = language === 'yue';
  if (yue) {
    return `SIMPLE PROBLEM-HELP TURN (overrides the short-reply rules above):
- 呢個係實用點樣整／小故障 — 唔使跟住「48字 / 1–3句」上限。
- 先認清楚問題，再用 2–5 個短步驟（可以編號），每步一句講完；大約 4–8 句。
- 語氣務實、鼓勵；唔好講緊急醫療／法律／危機建議（危機有固定安全路徑）。
- 仍然用口語粵語，唔好長篇理論。照舊最後一行 [emotion:{...}]。`;
  }
  return `SIMPLE PROBLEM-HELP TURN (overrides the short-reply rules above):
- Help fix a simple everyday problem — about 4–8 spoken sentences.
- Structure: brief empathy + restatement → 2–5 clear steps (short numbered lines OK) → one check that the next action is doable.
- Practical troubleshooting tone. Do not give medical, legal, or crisis advice (crisis has a fixed safety path). No fluff. Still end with one line: [emotion:{...}].`;
}

export function longTalkSystemBlock(kind: LongTalkKind, language?: string): string {
  if (kind === 'story') return storySystemBlock(language);
  if (kind === 'science') return scienceSystemBlock(language);
  return helpSystemBlock(language);
}

/** Token budget for the generation tail. Story is longest; chat stays short. */
export function maxTokensForLongTalk(
  kind: LongTalkKind | null,
  detailedRecipe = false,
): number {
  if (kind === 'story') return STORY_MAX_TOKENS;
  if (kind === 'science') return SCIENCE_MAX_TOKENS;
  if (kind === 'help') return HELP_MAX_TOKENS;
  if (detailedRecipe) return DETAILED_RECIPE_MAX_TOKENS;
  return DEFAULT_CHAT_MAX_TOKENS;
}

/** True when this user turn should skip the short reply trim / get richer prompts. */
export function wantsLongTalk(lastUser: string, hints?: LongTalkHints): boolean {
  return detectLongTalkKind(lastUser, hints) != null;
}
