// Chat idle rail SoT: fresh sequential #1..N → clipId (not full library #).
// ONLY Pixel Designer OK poses (PIXEL_OK_IDLE_NUMS). Library # stays in idle-library.ts.

import { isRetiredIdleClip } from './idle-retired';
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
 * Ordered curated chat rail — Pixel OK only.
 * #36 IdleHug retired (blend-to-back) even though first-pass singing OK.
 */
export const CHAT_IDLE_CURATED: readonly IdleCuratedRailEntry[] = [
  // breathe / look (calm defaults)
  { railNum: 1, clipId: 'IdleRpmFStanding001', labelKey: 'idle.rail.rpmStandF', category: 'breathe', legacyLibNum: 42 },
  { railNum: 2, clipId: 'LookAround', labelKey: 'idle.rail.lookAround', category: 'look', legacyLibNum: 3 },
  { railNum: 3, clipId: 'IdleRpmMVar001', labelKey: 'idle.rail.rpmVarM1', category: 'look', legacyLibNum: 94 },
  // think
  { railNum: 4, clipId: 'IdleSassy', labelKey: 'idle.rail.sassy', category: 'think', legacyLibNum: 34 },
  // stretch
  { railNum: 5, clipId: 'IdleRpmMVar002', labelKey: 'idle.rail.neckStretch', category: 'stretch', legacyLibNum: 95 },
  { railNum: 6, clipId: 'IdleMixamoArmStretch', labelKey: 'idle.rail.armStretch', category: 'stretch', legacyLibNum: 53 },
  // sing / slow
  { railNum: 7, clipId: 'IdleMixamoHappy', labelKey: 'idle.rail.happyIdle', category: 'sing', legacyLibNum: 41 },
  { railNum: 8, clipId: 'lib_C120', labelKey: 'idle.rail.slowArmDance', category: 'sing', legacyLibNum: 113 },
  // dance
  { railNum: 9, clipId: 'lib_C111', labelKey: 'idle.rail.robotDance', category: 'dance', legacyLibNum: 101 },
  { railNum: 10, clipId: 'lib_C112', labelKey: 'idle.rail.slowJazz', category: 'dance', legacyLibNum: 102 },
  { railNum: 11, clipId: 'lib_C113', labelKey: 'idle.rail.hipHop', category: 'dance', legacyLibNum: 103 },
  // tai chi
  { railNum: 12, clipId: 'lib_C121', labelKey: 'idle.rail.taiChi', category: 'martial', legacyLibNum: 114 },
  // expression / reaction
  { railNum: 13, clipId: 'ThumbsUp', labelKey: 'idle.rail.thumbsUp', category: 'react', legacyLibNum: 20 },
  { railNum: 14, clipId: 'Cheer', labelKey: 'idle.rail.cheerOil', category: 'react', legacyLibNum: 22 },
  { railNum: 15, clipId: 'PlayPunch', labelKey: 'idle.rail.funnyCry', category: 'react', legacyLibNum: 108 },
  { railNum: 16, clipId: 'YesCheer', labelKey: 'idle.rail.hurray', category: 'react', legacyLibNum: 109 },
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

/** Default ON rotation: curated #1+#2 (OK stand + look-around). */
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
  if (!lib || lib.retired || !lib.playable || !lib.vrmaUrl || isRetiredIdleClip(clipId)) return undefined;
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
    if (!lib) throw new Error(`curated ${e.railNum} ${e.clipId} not playable`);
    if (isRetiredIdleClip(e.clipId)) throw new Error(`curated includes retired ${e.clipId}`);
  }
  for (let i = 1; i <= CHAT_IDLE_CURATED.length; i++) {
    if (!rails.has(i)) throw new Error(`missing rail #${i}`);
  }
}
