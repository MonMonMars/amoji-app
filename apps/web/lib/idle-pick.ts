// Per-companion idle pin. Same localStorage shape as the other chat prefs.
// Default rotation = cleaner upright planted stands only (IdleRpmFStanding001 /
// IdleRpmMStanding001). Weak v3 clips + old gesture pins clear on load (v4 key).

import { resolveIdleClipId, isRetiredIdleClip } from './idle-retired';
import { idleClipById } from './idle-clips';

export const IDLE_PICK_KEY = 'amoji.idlePick.v4';
const KEY = IDLE_PICK_KEY;

/** Prefs keys from #392 / #407 — never carry weak pins into v4. */
const LEGACY_PICK_KEYS = [
  'amoji.idlePick.v1',
  'amoji.idlePick.v2',
  'amoji.idlePick.v3',
] as const;

/** Default rotation / safe persisted pins — cleaner upright stands only. */
export const DEFAULT_IDLE_IDS = [
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
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
  // v3 defaults that still looked weak — clear so v4 upright stands return.
  'IdleRpmFVar001',
  'IdleMixamoBreathing',
  'IdleInnersceneSam',
  'IdleRpmMVar002',
  'IdleRpmFVar003',
  'IdleRpmFVar004',
]);

type PickMap = Record<string, string>;

let memory: PickMap = {};
let loaded = false;

function dropLegacyPickKeys(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    for (const k of LEGACY_PICK_KEYS) {
      if (localStorage.getItem(k) != null) localStorage.removeItem(k);
    }
  } catch { /* private mode */ }
}

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    // Always scrub pre-v4 pins so weak v3 clips cannot linger beside v4.
    dropLegacyPickKeys();
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
      // Drop legacy bad pins so the upright planted rotation returns.
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
  return idleClipById(resolved) ? resolved : null;
}

export function saveIdlePick(characterId: string, clipId: string): string | null {
  if (!characterId || isRetiredIdleClip(clipId) || !idleClipById(clipId)) return idlePickFor(characterId);
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
