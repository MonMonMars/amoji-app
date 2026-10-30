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

/** Persona suffix while a story session is live. */
export function storyPersonaSuffix(lang: Lang): string {
  const scene = activeStoryScene();
  if (!scene) return '';
  return scene.systemBeat[lang] || scene.systemBeat.en;
}
