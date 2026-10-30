// Per-companion idle pin. Same localStorage shape as the other chat prefs.

import { idleClipById } from './idle-clips';

const KEY = 'amoji.idlePick.v1';

type PickMap = Record<string, string>;

let memory: PickMap = {};
let loaded = false;

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return memory;
    const next: PickMap = {};
    for (const [id, clip] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof clip === 'string' && idleClipById(clip)) next[id] = clip;
    }
    memory = next;
  } catch { /* ignore */ }
  return memory;
}

function persist(next: PickMap): void {
  memory = next;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

export function idlePickFor(characterId: string): string | null {
  return hydrate()[characterId] ?? null;
}

export function saveIdlePick(characterId: string, clipId: string): string | null {
  if (!characterId || !idleClipById(clipId)) return idlePickFor(characterId);
  const next = { ...hydrate(), [characterId]: clipId };
  persist(next);
  return clipId;
}

export function resetIdlePicks(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
