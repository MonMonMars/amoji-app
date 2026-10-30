// The clip tapped on the select board. Chat used to ignore it and keep
// playing the default file (or live TTS). One pick per companion per emotion.

import {
  clipFile,
  clipLibraryFile,
  emotionKindForFile,
  type BurstClipKind,
  type ClipFolder,
  type VoiceClipGender,
} from './voice-clips';

const KEY = 'amoji.emotionClips.v1';

export interface EmotionClipPick {
  folder: ClipFolder;
  gender: VoiceClipGender;
  file: string;
}

type PickMap = Record<string, Partial<Record<string, EmotionClipPick>>>;

let memory: PickMap = {};
let loaded = false;

function persist(next: PickMap): void {
  memory = next;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return memory;
    memory = parsed as PickMap;
  } catch { /* ignore */ }
  return memory;
}

export function emotionClipPick(characterId: string, kind: string): EmotionClipPick | null {
  return hydrate()[characterId]?.[kind] ?? null;
}

/** Remember this file for the emotion it belongs to. Invalid files are ignored. */
export function saveEmotionClip(
  characterId: string,
  folder: ClipFolder,
  gender: VoiceClipGender,
  file: string,
): EmotionClipPick | null {
  const kind = emotionKindForFile(file);
  if (!kind || !clipLibraryFile(folder, gender, file)) return null;
  const current = { ...hydrate() };
  const slot = { ...current[characterId] };
  slot[kind] = { folder, gender, file };
  current[characterId] = slot;
  persist(current);
  return slot[kind]!;
}

/**
 * File to play for this burst. A select-board pick wins. Otherwise the
 * canonical clip for the companion's language and gender.
 */
export function emotionClipPath(
  characterId: string,
  lang: string,
  gender: VoiceClipGender,
  kind: BurstClipKind | string,
): string {
  const pick = emotionClipPick(characterId, kind);
  if (pick) {
    const path = clipLibraryFile(pick.folder, pick.gender, pick.file);
    if (path) return path;
  }
  return clipFile(lang, gender, kind as BurstClipKind);
}

export function resetEmotionClipPicks(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
