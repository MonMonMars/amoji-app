// Per-companion idle pin. Same localStorage shape as the other chat prefs.
// Default = IdleQuaterniusHuman (v6) — visibly different from RPM F stand.
// Aggressive scrub drops every prior amoji.idle* key on hydrate.

import {
  DEFAULT_IDLE_CLIP_ID,
  isBannedAutoIdleClip,
  resolveIdleClipId,
  isRetiredIdleClip,
} from './idle-retired';
import { idleClipById } from './idle-clips';
import { IDLE_PICK_KEY, scrubAllAmojiIdleKeys } from './idle-prefs-scrub';

export { IDLE_PICK_KEY };
export { DEFAULT_IDLE_CLIP_ID };

const KEY = IDLE_PICK_KEY;

/** Default rotation / safe persisted pins — one near-still upright stand. */
export const DEFAULT_IDLE_IDS = [
  DEFAULT_IDLE_CLIP_ID,
] as const;

/** Old defaults / gesture pins that must not stick after the calm swap. */
const BAD_SAVED_IDLE_IDS = new Set([
  'IdleBreathCalm',
  'StandardIdle',
  'IdleNeutral',
  'IdleChinHand',
  'IdleHug',
  'HelloWave',
  'LookAround',
  'IdleSassy',
  'IdleRpmMVar001',
  'IdleRpmFVar001',
  'IdleMixamoBreathing',
  'IdleInnersceneSam',
  'IdleRpmMVar002',
  'IdleRpmFVar003',
  'IdleRpmFVar004',
  'IdleRpmMStanding001',
  'IdleRpmFStanding001', // v5 default — still looked same-bad to owner
]);

type PickMap = Record<string, string>;

let memory: PickMap = {};
let loaded = false;

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    scrubAllAmojiIdleKeys();
    const raw = localStorage.getItem(KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return memory;
    const next: PickMap = {};
    let changed = false;
    for (const [id, clip] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof clip !== 'string'
        || isRetiredIdleClip(clip)
        || isBannedAutoIdleClip(clip)
        || !idleClipById(clip)
      ) {
        changed = true;
        continue;
      }
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
  const raw = hydrate()[characterId];
  if (!raw) return null;
  const resolved = resolveIdleClipId(raw);
  if (isBannedAutoIdleClip(resolved) || BAD_SAVED_IDLE_IDS.has(resolved)) return null;
  return idleClipById(resolved) ? resolved : null;
}

export function saveIdlePick(characterId: string, clipId: string): string | null {
  if (
    !characterId
    || isRetiredIdleClip(clipId)
    || isBannedAutoIdleClip(clipId)
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
