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

/** First in-scene line when Story Mode opens (character pulls the user in). */
export function storyOpeningLine(lang: Lang): string | null {
  const scene = activeStoryScene();
  if (!scene?.openingLine) return null;
  return scene.openingLine[lang] || scene.openingLine.en || null;
}

/** Persona suffix while a story session is live. */
export function storyPersonaSuffix(lang: Lang): string {
  const scene = activeStoryScene();
  if (!scene) return '';
  const beat = scene.systemBeat[lang] || scene.systemBeat.en;
  const drive =
    lang === 'yue'
      ? '你係故事入面嘅角色，唔係普通傾偈。用場景同感覺帶用戶入去；你講故事推進，等用戶一齊推劇情。唔好跳去跳舞／唱歌／天氣邀請。'
      : lang === 'zh'
        ? '你是故事里的角色，不是普通聊天。用场景和感受把用户拉进故事；你推进叙事，让用户一起驾驶剧情。不要跳去跳舞/唱歌/天气邀请。'
        : lang === 'ja'
          ? 'あなたは物語の登場人物であり、通常の雑談相手ではない。場面と感情でユーザーを物語へ引き込み、あなたが語り進め、ユーザーと一緒に物語を進める。ダンス／歌／天気の勧誘はしない。'
          : 'You are a character inside this story, not ordinary chat mode. Pull the user into the scene with sensory detail; YOU lead the tale and let them steer with you. Never bolt dance / sing / weather invites onto the story.';
  return `${beat}\n${drive}`;
}
