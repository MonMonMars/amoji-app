'use client';
// Active Story Mode session (t740). Survives the hop from /story → /chat.
// Cleared when the user starts Chat Mode setup or confirms /change.

import { storyById, type StoryScene } from './stories';
import type { Lang } from './prefs';

const KEY = 'amoji.storySession.v1';

export type StorySession = {
  sceneId: string;
  characterId: string;
  backgroundId: string;
};

function canStore(): boolean {
  return typeof sessionStorage !== 'undefined';
}

export function loadStorySession(): StorySession | null {
  if (!canStore()) return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorySession;
    if (!parsed?.sceneId || !parsed?.characterId || !parsed?.backgroundId) return null;
    if (!storyById(parsed.sceneId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStorySession(session: StorySession): void {
  if (!canStore()) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch { /* private mode */ }
}

export function clearStorySession(): void {
  if (!canStore()) return;
  try { sessionStorage.removeItem(KEY); } catch { /* */ }
}

export function activeStoryScene(): StoryScene | null {
  const s = loadStorySession();
  return s ? storyById(s.sceneId) ?? null : null;
}

/**
 * First in-scene line when Story Mode opens (character pulls the user in).
 * Always returns a line when a scene is live — never fall back to chat hello.
 */
export function storyOpeningLine(lang: Lang): string | null {
  const scene = activeStoryScene();
  if (!scene) return null;
  const crafted = scene.openingLine?.[lang] || scene.openingLine?.en;
  if (crafted?.trim()) return crafted.trim();
  const title = scene.title[lang] || scene.title.en;
  const blurb = scene.blurb[lang] || scene.blurb.en;
  return `${title}… ${blurb}`;
}

/** Persona suffix while a story session is live. */
export function storyPersonaSuffix(lang: Lang): string {
  const scene = activeStoryScene();
  if (!scene) return '';
  const beat = scene.systemBeat[lang] || scene.systemBeat.en;
  const drive =
    lang === 'yue'
      ? '你係故事入面嘅角色，唔係普通傾偈伴。用感官細節帶用戶入場景；你推進情節同角色感覺，等用戶一齊推劇情。回覆要似講故事／角色對白，唔好似客服打招呼。唔好跳去跳舞／唱歌／天氣／新聞邀請。'
      : lang === 'zh'
        ? '你是故事里的角色，不是普通聊天伴。用感官细节把用户拉进场景；你推进情节和角色感受，让用户一起驾驶剧情。回复要像讲故事／角色对白，不要像客服打招呼。不要跳去跳舞/唱歌/天气/新闻邀请。'
        : lang === 'ja'
          ? 'あなたは物語の登場人物であり、通常の雑談相手ではない。感覚描写でユーザーを場面へ引き込み、あなたが筋と感情を進め、ユーザーと一緒に物語を進める。客のような挨拶ではなく、物語／役の台詞で話す。ダンス／歌／天気／ニュースの勧誘はしない。'
          : 'You are a character inside this story, not ordinary chat mode. Pull the user into the scene with sensory detail; YOU advance plot and feeling and let them steer with you. Speak as story / in-character dialogue — never a generic companion hello or skill brief. Never bolt dance / sing / weather / news invites onto the story.';
  return `${beat}\n${drive}`;
}
