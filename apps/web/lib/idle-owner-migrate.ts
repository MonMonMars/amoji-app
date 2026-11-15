/**
 * Honor owner idle picks across pref version bumps.
 *
 * History: agents bumped amoji.idle*.v3 → v4 → v5 and *wiped* legacy keys,
 * throwing away intentional rail enables + per-character pins. Owner still
 * says they already selected idle poses — those lived in localStorage only
 * (never a committed pin list). This helper migrates good picks forward and
 * only scrubs known-bad clips (BreathCalm / Sassy / sky-look / gestures).
 */

import { isRetiredIdleClip } from './idle-retired';

/**
 * Current prefs generation — migrate from every prior key, do not wipe.
 * FREEZE: do not bump to v7+ without a migrate-forward path. Pref-version
 * churn (v3→v4→v5 wipe) discarded owner selections — that is the bug.
 */
export const IDLE_PREFS_GENERATION = 6 as const;
export const IDLE_ENABLED_KEY = `amoji.idleEnabled.v${IDLE_PREFS_GENERATION}`;
export const IDLE_PICK_KEY = `amoji.idlePick.v${IDLE_PREFS_GENERATION}`;

/** All prior idle enable keys (newest first for migrate preference). */
export const LEGACY_IDLE_ENABLED_KEYS = [
  'amoji.idleEnabled.v5',
  'amoji.idleEnabled.v4',
  'amoji.idleEnabled.v3',
  'amoji.idleEnabled.v2',
  'amoji.idleEnabled.v1',
] as const;

/** All prior per-character pin keys (newest first). */
export const LEGACY_IDLE_PICK_KEYS = [
  'amoji.idlePick.v5',
  'amoji.idlePick.v4',
  'amoji.idlePick.v3',
  'amoji.idlePick.v2',
  'amoji.idlePick.v1',
] as const;

/**
 * Clips that must never survive migrate / save.
 * Keep this tight — owner-selected RPM stands / Mixamo / Innerscene stay
 * even when auto-idle defaults elsewhere.
 */
export const KNOWN_BAD_IDLE_CLIP_IDS = new Set<string>([
  'IdleBreathCalm',
  'IdleSassy',
  'StandardIdle',
  'IdleRpmMVar001', // sudden sky-look
  'LookAround', // baked sky-look wander
  'HelloWave', // farewell gesture, not an idle pin
  'IdleHug', // lean/hug spun torso on A→B
  'IdleChinHand',
  'IdleNeutral',
]);

export function isKnownBadIdleClip(clipId: string | null | undefined): boolean {
  if (!clipId) return true;
  if (isRetiredIdleClip(clipId)) return true;
  return KNOWN_BAD_IDLE_CLIP_IDS.has(clipId);
}

/** True when a saved pin/enable clip should be kept for the owner. */
export function isHonorableIdleClip(clipId: string | null | undefined): boolean {
  if (!clipId) return false;
  return !isKnownBadIdleClip(clipId);
}

function readRaw(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch { /* private mode */ }
}

function removeRaw(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch { /* private mode */ }
}

export type IdlePrefNumKind = 'rail' | 'library';

/** v1 stored idle-library #; v2+ stored curated rail #. */
export function idlePrefNumKindForKey(key: string): IdlePrefNumKind {
  if (key.endsWith('.v1') || key.endsWith('.v1.')) return 'library';
  return 'rail';
}

/**
 * Prefer current key; else first legacy key with data (newest → oldest).
 * After a successful read from legacy, copy into current and drop legacy keys.
 */
export function readMigratingPrefJson(
  currentKey: string,
  legacyKeys: readonly string[],
): { raw: string | null; migratedFrom: string | null; numKind: IdlePrefNumKind } {
  const current = readRaw(currentKey);
  if (current != null && current !== '') {
    return { raw: current, migratedFrom: null, numKind: idlePrefNumKindForKey(currentKey) };
  }
  for (const k of legacyKeys) {
    const raw = readRaw(k);
    if (raw != null && raw !== '') {
      writeRaw(currentKey, raw);
      for (const drop of legacyKeys) removeRaw(drop);
      return { raw, migratedFrom: k, numKind: idlePrefNumKindForKey(k) };
    }
  }
  for (const drop of legacyKeys) removeRaw(drop);
  return { raw: null, migratedFrom: null, numKind: 'rail' };
}

/** Drop prior-generation keys after current key already holds the migrated map. */
export function dropLegacyPrefKeys(legacyKeys: readonly string[]): void {
  for (const k of legacyKeys) removeRaw(k);
}
