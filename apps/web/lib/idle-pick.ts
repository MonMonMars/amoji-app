// Per-companion idle pin. Same localStorage shape as the other chat prefs.
// Fresh auto default = IdleQuaterniusHuman (#430). Owner pins (incl. RPM F/M)
// migrate forward and win (#432). v6 migrates v1–v5; only known-bad scrubbed.

import { idleClipById } from './idle-clips';
import {
  IDLE_PICK_KEY,
  LEGACY_IDLE_PICK_KEYS,
  dropLegacyPrefKeys,
  isHonorableIdleClip,
  isKnownBadIdleClip,
  readMigratingPrefJson,
} from './idle-owner-migrate';
import { ownerIdleClipDeleted } from './owner-picker-decisions';
import { resolveIdleClipId, isRetiredIdleClip } from './idle-retired';

export { IDLE_PICK_KEY };
const KEY = IDLE_PICK_KEY;

/** Default rotation / safe persisted pins — last known owner-good upright stand. */
export const DEFAULT_IDLE_IDS = [
  'IdleRpmFStanding001',
] as const;

type PickMap = Record<string, string>;

let memory: PickMap = {};
let loaded = false;

function scrubPickMap(parsed: Record<string, unknown>): { next: PickMap; changed: boolean } {
  const next: PickMap = {};
  let changed = false;
  for (const [id, clip] of Object.entries(parsed)) {
    if (typeof clip !== 'string' || !idleClipById(clip) || !isHonorableIdleClip(clip) || ownerIdleClipDeleted(clip)) {
      changed = true;
      continue;
    }
    next[id] = clip;
  }
  return { next, changed };
}

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const { raw, migratedFrom } = readMigratingPrefJson(KEY, LEGACY_IDLE_PICK_KEYS);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return memory;
    const { next, changed } = scrubPickMap(parsed as Record<string, unknown>);
    memory = next;
    if (changed || migratedFrom) {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
      dropLegacyPrefKeys(LEGACY_IDLE_PICK_KEYS);
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
    dropLegacyPrefKeys(LEGACY_IDLE_PICK_KEYS);
  } catch { /* private mode */ }
}

export function idlePickFor(characterId: string): string | null {
  const raw = hydrate()[characterId];
  if (!raw) return null;
  // Owner pins win: do not drop honorable pins when auto-idle bans grow.
  if (isKnownBadIdleClip(raw) || isRetiredIdleClip(raw) || !idleClipById(raw)) return null;
  const resolved = resolveIdleClipId(raw);
  if (resolved !== raw && isHonorableIdleClip(raw) && idleClipById(raw)) {
    return raw;
  }
  if (isKnownBadIdleClip(resolved) || !idleClipById(resolved)) return null;
  return resolved;
}

export function saveIdlePick(characterId: string, clipId: string): string | null {
  if (
    !characterId
    || isRetiredIdleClip(clipId)
    || isKnownBadIdleClip(clipId)
    || !idleClipById(clipId)
  ) {
    return idlePickFor(characterId);
  }
  const next = { ...hydrate(), [characterId]: clipId };
  persist(next);
  return clipId;
}

/** Drop one companion's pin so chat idle rotation resumes. */
export function clearIdlePick(characterId: string): void {
  if (!characterId) return;
  const cur = hydrate();
  if (!(characterId in cur)) return;
  const next = { ...cur };
  delete next[characterId];
  persist(next);
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
