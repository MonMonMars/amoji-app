// Which curated idle rail #s are ON for rotation. Persists like mute prefs.
// Default = curated #1+#2 (IdleRpmFStanding001 + LookAround).

import { isRetiredIdleNum } from './idle-retired';
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

export const IDLE_ENABLED_KEY = 'amoji.idleEnabled.v1';
const KEY = IDLE_ENABLED_KEY;

let memory: number[] | null = null;
let loaded = false;

function hydrate(): number[] {
  if (loaded && memory) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') {
      memory = defaultCuratedRailNums();
      return memory;
    }
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
    const migrated = migrateEnabledNumsToRail(nums);
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
  memory = [...new Set(next)].sort((a, b) => a - b);
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
  if (!curatedRailByNum(railNum)) return listEnabledNums();
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
    const lib = idleByNum(row.legacyLibNum);
    if (!lib?.playable || lib.retired || isRetiredIdleNum(row.legacyLibNum)) continue;
    seen.add(row.clipId);
    ids.push(row.clipId);
  }
  if (!ids.length) {
    return defaultCuratedRailNums()
      .map((n) => curatedRailByNum(n)?.clipId)
      .filter((id): id is string => !!id);
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
