'use client';
// Story turns need long, multi-paragraph replies — the default 1–3 sentence
// budget (reply-shape + BASE_SYSTEM) is wrong for narrative. Detect story
// intent from Story Mode session or the user's words; see client-chat.ts.

import { loadStorySession } from './story-session';

export const STORY_MAX_TOKENS = 1024;

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
- 呢個係講故事或故事模式 — 唔使跟住「48字 / 1–3句」上限。
- 用多段、有畫面感嘅口語粵語敘事，大約 4–12 句，可以分兩三段（段落之間空一行）。
- 推進情節、角色同場景；可以留懸念，但唔使每段都追問用戶。
- 仍然用口語粒子（係／嘅／唔），唔好 markdown 列表。
- 照舊喺最後一行輸出 [emotion:{...}]。`;
  }
  return `STORY / NARRATIVE TURN (overrides the short-reply rules above):
- Tell a real story in rich spoken prose — multiple paragraphs are welcome (about 4–12 sentences, 2–3 short paragraphs with a blank line between beats).
- Paint the scene, advance the plot, show character feeling; chapter-style beats are OK. Do not pack everything into one tiny sentence.
- Do not end every paragraph with a question to the user — only when it fits the scene.
- No markdown, no numbered list unless they asked for steps. Still end with one line: [emotion:{...}].`;
}

export function maxTokensForStoryTurn(story: boolean, detailedRecipe: boolean): number {
  if (story) return STORY_MAX_TOKENS;
  if (detailedRecipe) return 520;
  return 280;
}
