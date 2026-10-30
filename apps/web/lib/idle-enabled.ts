// Which idle #s are ON for rotation / pick pool. Persists like mute prefs.
// Default = IDLE_LIBRARY defaultEnabled (#1 IdleBreathCalm + #2 StandardIdle).

import {
  defaultEnabledNums,
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
      memory = defaultEnabledNums();
      return memory;
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      memory = defaultEnabledNums();
      return memory;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      memory = defaultEnabledNums();
      return memory;
    }
    const nums = parsed
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
      .filter((n) => !!idleByNum(n));
    memory = nums.length ? [...new Set(nums)].sort((a, b) => a - b) : defaultEnabledNums();
    return memory;
  } catch {
    memory = defaultEnabledNums();
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

export function isIdleEnabled(num: number): boolean {
  return hydrate().includes(num);
}

export function setIdleEnabled(num: number, on: boolean): number[] {
  if (!idleByNum(num)) return listEnabledNums();
  const cur = new Set(hydrate());
  if (on) cur.add(num);
  else cur.delete(num);
  const next = [...cur];
  // Never leave the pool empty — fall back to defaults.
  if (!next.length) {
    persist(defaultEnabledNums());
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
  for (const e of playableIdles()) {
    if (!enabled.has(e.num) || seen.has(e.clipId)) continue;
    // Also accept if any library row with this clipId is enabled (C01/C42).
    seen.add(e.clipId);
    ids.push(e.clipId);
  }
  // If user enabled a later alias num (e.g. #13) but playableIdles kept #3:
  for (const num of hydrate()) {
    const e = idleByNum(num);
    if (!e?.playable || seen.has(e.clipId)) continue;
    seen.add(e.clipId);
    ids.push(e.clipId);
  }
  if (!ids.length) {
    return playableIdles()
      .filter((e) => e.defaultEnabled)
      .map((e) => e.clipId);
  }
  return ids;
}

export function resetIdleEnabled(): void {
  memory = defaultEnabledNums();
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
