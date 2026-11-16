'use client';
// Story turns need long, multi-paragraph replies — the default 1–3 sentence
// budget (reply-shape + BASE_SYSTEM) is wrong for narrative. Detect story
// intent from Story Mode session or the user's words; see client-chat.ts.
// Delivery: warm emotional arc + slightly slower TTS (storySpeechRateBias).

import { loadStorySession } from './story-session';

/** Room for rich beats, dialogue, and sensory detail — not a short summary. */
export const STORY_MAX_TOKENS = 1536;

/**
 * Soft, expressive feelings for story TTS. Prefer love/contentment over
 * joy/excitement so prosody stays warm and slightly slower (not chirpy).
 */
export const STORY_SPEECH_HINTS: Readonly<Record<string, number>> = {
  // Stay below INTERJECTION_AT (0.72) so fairy tales never open with 呀…… tics.
  love: 0.68,
  contentment: 0.66,
  relief: 0.42,
};

/**
 * Extra rate delta for story / fairy-tale lines only (Edge + gTTS + synth).
 * Negative = a bit slower storytelling pace. Casual talk leaves this at 0.
 */
export const STORY_SPEECH_RATE_BIAS = -0.12;

const STORY_ASK_RE =
  /(?:tell\s+(?:me\s+)?(?:a\s+)?stor(?:y|ies)|(?:a|the)\s+stor(?:y|ies)|narrat(?:e|ion)|fairy\s*tale|bedtime\s*stor(?:y|ies))/i;

const STORY_ASK_CJK =
  /(?:講(?:個|一個)?故事|讲(?:个|一个)?故事|說(?:個|一個)?故事|说(?:个|一个)?故事|讲个故事|講故事|讲故事|說故事|说故事|講故仔|讲故仔|講下故事|讲下故事|來個故事|来个故事|講故事俾我|讲故事给我|故事模式)/;

const STORY_CONTINUE_RE =
  /(?:continue\s+the\s+stor(?:y|ies)|keep\s+going|go\s+on|what\s+happens?\s+next|and\s+then\??|carry\s+on)/i;

const STORY_CONTINUE_CJK =
  /(?:繼續講|继续讲|接著講|接着讲|然後呢|然后呢|跟住點|跟住点|下一章|再講多啲|再讲多点|繼續故事|继续故事)/;

const ACTIVE_STORY_PERSONA = /(?:STORY\s*MODE|故事模式|ストーリーモード)/;

/** User explicitly asked for narrative, not just scene chat. */
export function userWantsStory(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  return (
    STORY_ASK_RE.test(t)
    || STORY_ASK_CJK.test(t)
    || STORY_CONTINUE_RE.test(t)
    || STORY_CONTINUE_CJK.test(t)
  );
}

export function hasActiveStorySession(): boolean {
  return !!loadStorySession();
}

export type StoryTurnHints = {
  persona?: string;
  /** Set when ChatPanel knows a story session is live (same as loadStorySession). */
  storySession?: boolean;
};

/** A turn that should use the long narrative budget and skip the short-reply cap. */
export function wantsStoryTurn(lastUser: string, hints?: StoryTurnHints): boolean {
  if (hints?.storySession ?? hasActiveStorySession()) return true;
  if (userWantsStory(lastUser)) return true;
  if (ACTIVE_STORY_PERSONA.test(hints?.persona ?? '')) return true;
  return false;
}

/** System addendum: overrides BASE_SYSTEM length and closing-question rules. */
export function storySystemBlock(language?: string): string {
  const yue = language === 'yue';
  if (yue) {
    return `STORY / NARRATIVE TURN (overrides the short-reply rules above):
- 呢個係故事模式 — 你係場景入面嘅角色／說書人，帶用戶入去；唔使跟住「48字 / 1–3句」上限。
- 講一個完整、有感情嘅故事，唔好縮成短摘要。用多段口語粵語敘事：開頭鋪場同感覺 → 中段衝突／渴望／對話 → 高潮 → 溫柔收束或懸念。大約 12–22 句，分 3–5 段（段落之間空一行）。
- 要有感官細節（光、氣味、溫度、聲音）、角色內心情緒同簡短對白；情緒弧要明顯（希望、害怕、溫柔、勇氣、寬恕）。
- 語速感要似慢慢講故：句子可以稍長、留呼吸；唔好急促清單式劇情。
- 推進情節同角色感覺；可以留懸念，但唔使每段都追問用戶。唔好一句講完成個故事。
- 唔好變返普通傾偈伴（唔好打招呼式 hi／技能簡介／跳舞唱歌天氣新聞邀請）。
- 仍然用口語粒子（係／嘅／唔），唔好 markdown 列表。
- 照舊喺最後一行輸出 [emotion:{...}] — 偏向 love / contentment / wonder（0.7–1.0），唔好用冷淡中性。`;
  }
  return `STORY / NARRATIVE TURN (overrides the short-reply rules above):
- You are inside Story Mode as an in-scene character / storyteller — lead them into the scene; they steer with you.
- Tell a FULL emotional story in rich spoken prose — NOT a short summary or plot bullet list. Multiple paragraphs are required (about 12–22 sentences across 3–5 beats with a blank line between paragraphs).
- Arc: open the scene with sensory mood → deepen desire/fear through character feeling and short dialogue → rise to a clear emotional peak → land a soft ending or cliffhanger.
- Include sensory detail (light, sound, temperature, scent), inner feeling, and brief spoken lines between characters. The listener should feel warmth, wonder, tenderness, courage, or mercy — not a flat report.
- Pace like a storyteller: unhurried sentences with room to breathe; never rush the whole tale into one tiny paragraph.
- Stay in character and in this setting. Never slip into ordinary companion chat (generic hi, skill brief, dance / sing / weather / news invites).
- Do not end every paragraph with a question to the user — only when it fits the scene (one soft in-world invite is enough).
- No markdown, no numbered list unless they asked for steps. Still end with one line: [emotion:{...}] weighted on love / contentment / wonder (0.7–1.0) — never flat-neutral.`;
}

/** @deprecated Prefer maxTokensForLongTalk in long-talk.ts — kept for existing tests. */
export function maxTokensForStoryTurn(story: boolean, detailedRecipe: boolean): number {
  if (story) return STORY_MAX_TOKENS;
  if (detailedRecipe) return 520;
  return 280;
}
