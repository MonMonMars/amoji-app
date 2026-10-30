// Per-companion idle pin. Same localStorage shape as the other chat prefs.
// Default rotation is only b01 IdleBreathCalm + b02 StandardIdle.
// Saved a01–a04 pins (old bad defaults) are cleared on load. b03/b04 stay
// optional side-rail picks. Clear the whole key with resetIdlePicks() or
// `localStorage.removeItem('amoji.idlePick.v1')`.

import { idleClipById } from './idle-clips';

export const IDLE_PICK_KEY = 'amoji.idlePick.v1';
const KEY = IDLE_PICK_KEY;

/** Default rotation / safe persisted pins. */
export const DEFAULT_IDLE_IDS = ['IdleBreathCalm', 'StandardIdle'] as const;

/** Old rail defaults that must not stick after the calm-only change. */
const BAD_SAVED_IDLE_IDS = new Set([
  'IdleNeutral',
  'IdleSassy',
  'IdleChinHand',
  'IdleHug',
]);

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
    let changed = false;
    for (const [id, clip] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof clip !== 'string' || !idleClipById(clip)) {
        changed = true;
        continue;
      }
      // Drop legacy a01–a04 pins so the calm b01/b02 rotation returns.
      if (BAD_SAVED_IDLE_IDS.has(clip)) {
        changed = true;
        continue;
      }
      next[id] = clip;
    }
    memory = next;
    if (changed) {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
    }
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

/** Test helper — drop the in-memory cache so the next read rehydrates. */
export function forgetIdlePickCache(): void {
  memory = {};
  loaded = false;
}

/** True when this clip is part of the calm default rotation. */
export function isDefaultIdleClip(clipId: string): boolean {
  return (DEFAULT_IDLE_IDS as readonly string[]).includes(clipId);
}
