// Aggressive idle prefs scrub — every prior `amoji.idle*` row can stick a
// bad pose across hard refreshes. On hydrate of the current prefs generation,
// drop ALL idle keys except the live vN pair so defaults always win.

export const IDLE_ENABLED_KEY = 'amoji.idleEnabled.v6';
export const IDLE_PICK_KEY = 'amoji.idlePick.v6';

const KEEP = new Set<string>([IDLE_ENABLED_KEY, IDLE_PICK_KEY]);

let scrubbed = false;

/**
 * Remove every localStorage key starting with `amoji.idle` except the current
 * v6 enabled/pick pair. Returns removed key names (empty when already scrubbed
 * this JS session or storage unavailable).
 */
export function scrubAllAmojiIdleKeys(): string[] {
  if (scrubbed) return [];
  scrubbed = true;
  const removed: string[] = [];
  try {
    if (typeof localStorage === 'undefined') return removed;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      if (!k.startsWith('amoji.idle')) continue;
      if (KEEP.has(k)) continue;
      localStorage.removeItem(k);
      removed.push(k);
    }
  } catch { /* private mode */ }
  return removed;
}

/** Test helper — allow re-scrub after forging legacy keys. */
export function forgetIdlePrefsScrub(): void {
  scrubbed = false;
}
