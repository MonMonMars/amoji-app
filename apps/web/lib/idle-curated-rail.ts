// Chat idle rail SoT: calm Pixel-OK only (breathe / look / think / stretch).
// Sing / dance / react / martial stay in library for content moves — not idle buttons.

import { isPixelCalmIdleClip, isRetiredIdleClip } from './idle-retired';
import { idleByClipId, type IdleLibraryEntry } from './idle-library';

export type IdleCuratedCategory =
  | 'breathe'
  | 'look'
  | 'think'
  | 'stretch'
  | 'sing'
  | 'dance'
  | 'martial'
  | 'react';

export interface IdleCuratedRailEntry {
  /** Button # on chat rail (1..N). */
  railNum: number;
  clipId: string;
  /** Stable key for future i18n (not wired to strings table yet). */
  labelKey: string;
  category: IdleCuratedCategory;
  /** Original idle-library # for migration from amoji.idleEnabled.v1. */
  legacyLibNum: number;
}

/**
 * Curated chat rail — Pixel calm idle only (suitable for standing idle / talk).
 * Performance OK poses are content-driven, not rail defaults.
 */
export const CHAT_IDLE_CURATED: readonly IdleCuratedRailEntry[] = [
  { railNum: 1, clipId: 'IdleRpmFStanding001', labelKey: 'idle.rail.rpmStandF', category: 'breathe', legacyLibNum: 42 },
  { railNum: 2, clipId: 'IdleSassy', labelKey: 'idle.rail.sassy', category: 'think', legacyLibNum: 34 },
  { railNum: 3, clipId: 'LookAround', labelKey: 'idle.rail.lookAround', category: 'look', legacyLibNum: 3 },
  { railNum: 4, clipId: 'IdleRpmMVar001', labelKey: 'idle.rail.rpmVarM1', category: 'look', legacyLibNum: 94 },
  { railNum: 5, clipId: 'IdleRpmMVar002', labelKey: 'idle.rail.neckStretch', category: 'stretch', legacyLibNum: 95 },
  { railNum: 6, clipId: 'IdleMixamoArmStretch', labelKey: 'idle.rail.armStretch', category: 'stretch', legacyLibNum: 53 },
];

const BY_RAIL = new Map(CHAT_IDLE_CURATED.map((e) => [e.railNum, e]));
const BY_CLIP = new Map(CHAT_IDLE_CURATED.map((e) => [e.clipId, e]));
const BY_LEGACY = new Map(CHAT_IDLE_CURATED.map((e) => [e.legacyLibNum, e]));

export function curatedRailByNum(railNum: number): IdleCuratedRailEntry | undefined {
  return BY_RAIL.get(railNum);
}

export function curatedRailByClipId(clipId: string): IdleCuratedRailEntry | undefined {
  return BY_CLIP.get(clipId);
}

export function curatedRailByLegacyLibNum(libNum: number): IdleCuratedRailEntry | undefined {
  return BY_LEGACY.get(libNum);
}

/** Default ON rotation: calm stand + think (Pixel: can use for idle). */
export function defaultCuratedRailNums(): number[] {
  return [1, 2];
}

/** Map stored enable list (legacy library # or rail #) → curated rail #. */
export function migrateEnabledNumsToRail(stored: number[]): number[] {
  const out = new Set<number>();
  for (const n of stored) {
    const fromLegacy = curatedRailByLegacyLibNum(n);
    if (fromLegacy) {
      out.add(fromLegacy.railNum);
      continue;
    }
    if (curatedRailByNum(n)) out.add(n);
  }
  const next = [...out].sort((a, b) => a - b);
  return next.length ? next : defaultCuratedRailNums();
}

export function curatedLibraryRow(clipId: string): IdleLibraryEntry | undefined {
  const lib = idleByClipId(clipId);
  if (
    !lib
    || lib.retired
    || !lib.playable
    || !lib.vrmaUrl
    || isRetiredIdleClip(clipId)
    || !isPixelCalmIdleClip(clipId)
  ) {
    return undefined;
  }
  return lib;
}

export function assertCuratedRailValid(): void {
  const rails = new Set<number>();
  for (const e of CHAT_IDLE_CURATED) {
    if (rails.has(e.railNum)) throw new Error(`duplicate rail #${e.railNum}`);
    rails.add(e.railNum);
    if (e.railNum < 1 || e.railNum > CHAT_IDLE_CURATED.length) {
      throw new Error(`rail #${e.railNum} out of 1..${CHAT_IDLE_CURATED.length}`);
    }
    const lib = curatedLibraryRow(e.clipId);
    if (!lib) throw new Error(`curated ${e.railNum} ${e.clipId} not calm-playable`);
    if (isRetiredIdleClip(e.clipId)) throw new Error(`curated includes retired ${e.clipId}`);
  }
  for (let i = 1; i <= CHAT_IDLE_CURATED.length; i++) {
    if (!rails.has(i)) throw new Error(`missing rail #${i}`);
  }
}
