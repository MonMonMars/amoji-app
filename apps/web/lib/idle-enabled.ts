// Which curated idle rail #s are ON for rotation. Persists like mute prefs.
// Default = single calm upright planted stand (#42 / rail #5).
// v5 drops dual-stand A→B (rail #11) and scrubs BreathCalm/Sassy forever.

import { isBannedAutoIdleClip, isRetiredIdleNum } from './idle-retired';
import {
  CHAT_IDLE_CURATED,
  curatedRailByNum,
  defaultCuratedRailNums,
  migrateEnabledNumsToRail,
} from './idle-curated-rail';
import {
  idleByNum,
  playableIdles,
  type IdleLibraryEntry,
} from './idle-library';

export const IDLE_ENABLED_KEY = 'amoji.idleEnabled.v5';
const KEY = IDLE_ENABLED_KEY;

/** Prefs keys from #392 / #407 / #415 — never migrate weak clips into v5. */
const LEGACY_ENABLED_KEYS = [
  'amoji.idleEnabled.v1',
  'amoji.idleEnabled.v2',
  'amoji.idleEnabled.v3',
  'amoji.idleEnabled.v4',
] as const;

let memory: number[] | null = null;
let loaded = false;

function dropLegacyEnabledKeys(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    for (const k of LEGACY_ENABLED_KEYS) {
      if (localStorage.getItem(k) != null) localStorage.removeItem(k);
    }
  } catch { /* private mode */ }
}

function scrubBannedRails(nums: number[]): number[] {
  const next = nums.filter((n) => {
    const row = curatedRailByNum(n);
    if (!row) return false;
    if (isBannedAutoIdleClip(row.clipId)) return false;
    return true;
  });
  return next.length ? next : defaultCuratedRailNums();
}

function hydrate(): number[] {
  if (loaded && memory) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') {
      memory = defaultCuratedRailNums();
      return memory;
    }
    dropLegacyEnabledKeys();
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      memory = defaultCuratedRailNums();
      return memory;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      memory = defaultCuratedRailNums();
      return memory;
    }
    const nums = parsed
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n));
    const migrated = scrubBannedRails(migrateEnabledNumsToRail(nums));
    memory = migrated;
    if (JSON.stringify(migrated) !== JSON.stringify(nums)) {
      try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch { /* private mode */ }
    }
    return memory;
  } catch {
    memory = defaultCuratedRailNums();
    return memory;
  }
}

function persist(next: number[]): void {
  memory = [...new Set(scrubBannedRails(next))].sort((a, b) => a - b);
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch { /* private mode */ }
}

export function listEnabledNums(): number[] {
  return [...hydrate()];
}

export function isIdleEnabled(railNum: number): boolean {
  return hydrate().includes(railNum);
}

export function setIdleEnabled(railNum: number, on: boolean): number[] {
  const row = curatedRailByNum(railNum);
  if (!row || isBannedAutoIdleClip(row.clipId)) return listEnabledNums();
  const cur = new Set(hydrate());
  if (on) cur.add(railNum);
  else cur.delete(railNum);
  const next = [...cur];
  if (!next.length) {
    persist(defaultCuratedRailNums());
    return listEnabledNums();
  }
  persist(next);
  return listEnabledNums();
}

/** Playable clip ids currently enabled (for idle rotation). */
export function listEnabledIdleClipIds(): string[] {
  const enabled = new Set(hydrate());
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of CHAT_IDLE_CURATED) {
    if (!enabled.has(row.railNum) || seen.has(row.clipId)) continue;
    if (isBannedAutoIdleClip(row.clipId)) continue;
    const lib = idleByNum(row.legacyLibNum);
    if (!lib?.playable || lib.retired || isRetiredIdleNum(row.legacyLibNum)) continue;
    seen.add(row.clipId);
    ids.push(row.clipId);
  }
  if (!ids.length) {
    return defaultCuratedRailNums()
      .map((n) => curatedRailByNum(n)?.clipId)
      .filter((id): id is string => !!id && !isBannedAutoIdleClip(id));
  }
  return ids;
}

export function resetIdleEnabled(): void {
  memory = defaultCuratedRailNums();
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

export function forgetIdleEnabledCache(): void {
  memory = null;
  loaded = false;
}

export function enabledPlayableEntries(): IdleLibraryEntry[] {
  const want = new Set(listEnabledIdleClipIds());
  return playableIdles().filter((e) => want.has(e.clipId));
}
