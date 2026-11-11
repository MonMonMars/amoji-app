// Per-companion idle pin. Same localStorage shape as the other chat prefs.
// Default rotation is Pixel-OK IdleRpmFStanding001 + LookAround.
// Saved non-OK / retired pins are cleared on load.

import { isPixelCalmIdleClip, isRetiredIdleClip, resolveCalmIdleClipId } from './idle-retired';
import { idleClipById } from './idle-clips';

export const IDLE_PICK_KEY = 'amoji.idlePick.v1';
const KEY = IDLE_PICK_KEY;

/** Default rotation / safe persisted pins — Pixel calm idle only. */
export const DEFAULT_IDLE_IDS = ['IdleRpmFStanding001', 'IdleSassy'] as const;

/** Legacy pins that must not stick after Pixel-OK-only change. */
const BAD_SAVED_IDLE_IDS = new Set([
  'IdleBreathCalm',
  'StandardIdle',
  'IdleNeutral',
  'IdleChinHand',
  'IdleHug',
  'HelloWave',
  'Relax',
  'Thinking',
  'IdleQuaterniusHuman',
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
      if (typeof clip !== 'string' || isRetiredIdleClip(clip) || !idleClipById(clip)) {
        changed = true;
        continue;
      }
      if (BAD_SAVED_IDLE_IDS.has(clip) || !isPixelCalmIdleClip(clip)) {
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
  const raw = hydrate()[characterId];
  if (!raw) return null;
  const resolved = resolveCalmIdleClipId(raw);
  return isPixelCalmIdleClip(resolved) && idleClipById(resolved) ? resolved : null;
}

export function saveIdlePick(characterId: string, clipId: string): string | null {
  if (
    !characterId
    || isRetiredIdleClip(clipId)
    || !isPixelCalmIdleClip(clipId)
    || !idleClipById(clipId)
  ) {
    return idlePickFor(characterId);
  }
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
