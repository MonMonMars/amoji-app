// Chat idle rail SoT: fresh sequential #1..N → clipId (not full library #).
// Library # stays in idle-library.ts for gallery / smoke.

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

/** Ordered curated chat rail (~25–40 good poses). */
export const CHAT_IDLE_CURATED: readonly IdleCuratedRailEntry[] = [
  // breathe / calm stand
  { railNum: 1, clipId: 'IdleBreathCalm', labelKey: 'idle.rail.breathCalm', category: 'breathe', legacyLibNum: 1 },
  { railNum: 2, clipId: 'StandardIdle', labelKey: 'idle.rail.standardIdle', category: 'breathe', legacyLibNum: 2 },
  { railNum: 3, clipId: 'IdleMixamoBreathing', labelKey: 'idle.rail.mixamoBreathing', category: 'breathe', legacyLibNum: 40 },
  { railNum: 4, clipId: 'IdleNeutral', labelKey: 'idle.rail.neutral', category: 'breathe', legacyLibNum: 33 },
  { railNum: 5, clipId: 'IdleRpmFStanding001', labelKey: 'idle.rail.rpmStandF', category: 'breathe', legacyLibNum: 42 },
  { railNum: 6, clipId: 'IdleQuaterniusHuman', labelKey: 'idle.rail.quaterniusHuman', category: 'breathe', legacyLibNum: 39 },
  { railNum: 7, clipId: 'lib_C04', labelKey: 'idle.rail.kaykitIdle', category: 'breathe', legacyLibNum: 5 },
  { railNum: 8, clipId: 'IdleRpmFVar001', labelKey: 'idle.rail.rpmVarF1', category: 'breathe', legacyLibNum: 43 },
  { railNum: 9, clipId: 'lib_C25', labelKey: 'idle.rail.bored', category: 'breathe', legacyLibNum: 7 },
  { railNum: 10, clipId: 'IdleInnersceneSam', labelKey: 'idle.rail.innersceneSam', category: 'breathe', legacyLibNum: 90 },
  { railNum: 11, clipId: 'IdleRpmMStanding001', labelKey: 'idle.rail.rpmStandM', category: 'breathe', legacyLibNum: 93 },
  // look / subtle
  { railNum: 12, clipId: 'LookAround', labelKey: 'idle.rail.lookAround', category: 'look', legacyLibNum: 3 },
  { railNum: 13, clipId: 'lib_C42', labelKey: 'idle.rail.lookAround02', category: 'look', legacyLibNum: 13 },
  { railNum: 14, clipId: 'IdleRpmFVar003', labelKey: 'idle.rail.rpmVarF3', category: 'look', legacyLibNum: 45 },
  { railNum: 15, clipId: 'IdleRpmFVar004', labelKey: 'idle.rail.rpmVarF4', category: 'look', legacyLibNum: 46 },
  { railNum: 16, clipId: 'IdleRpmMVar001', labelKey: 'idle.rail.rpmVarM1', category: 'look', legacyLibNum: 94 },
  // think
  { railNum: 17, clipId: 'Thinking', labelKey: 'idle.rail.thinking', category: 'think', legacyLibNum: 18 },
  { railNum: 18, clipId: 'IdleSassy', labelKey: 'idle.rail.sassy', category: 'think', legacyLibNum: 34 },
  // stretch
  { railNum: 19, clipId: 'Relax', labelKey: 'idle.rail.relax', category: 'stretch', legacyLibNum: 32 },
  { railNum: 20, clipId: 'IdleMixamoArmStretch', labelKey: 'idle.rail.armStretch', category: 'stretch', legacyLibNum: 53 },
  { railNum: 21, clipId: 'IdleRpmMVar002', labelKey: 'idle.rail.neckStretch', category: 'stretch', legacyLibNum: 95 },
  // sing / slow
  { railNum: 22, clipId: 'IdleMixamoHappy', labelKey: 'idle.rail.happyIdle', category: 'sing', legacyLibNum: 41 },
  // IdleHug (#36) retired — lean/hug spun torso through the back on A→B blends.
  { railNum: 23, clipId: 'IdleMixamoHappy', labelKey: 'idle.rail.happyIdle', category: 'sing', legacyLibNum: 41 },
  { railNum: 24, clipId: 'lib_C120', labelKey: 'idle.rail.slowArmDance', category: 'sing', legacyLibNum: 113 },
  // dance
  { railNum: 25, clipId: 'lib_C111', labelKey: 'idle.rail.robotDance', category: 'dance', legacyLibNum: 101 },
  { railNum: 26, clipId: 'lib_C112', labelKey: 'idle.rail.slowJazz', category: 'dance', legacyLibNum: 102 },
  { railNum: 27, clipId: 'lib_C113', labelKey: 'idle.rail.hipHop', category: 'dance', legacyLibNum: 103 },
  { railNum: 28, clipId: 'lib_C114', labelKey: 'idle.rail.partyDance', category: 'dance', legacyLibNum: 104 },
  // tai chi / martial
  { railNum: 29, clipId: 'lib_C121', labelKey: 'idle.rail.taiChi', category: 'martial', legacyLibNum: 114 },
  { railNum: 30, clipId: 'lib_C122', labelKey: 'idle.rail.swordDraw', category: 'martial', legacyLibNum: 115 },
  { railNum: 31, clipId: 'lib_C123', labelKey: 'idle.rail.swordPoint', category: 'martial', legacyLibNum: 116 },
  // expression / reaction
  { railNum: 32, clipId: 'ThumbsUp', labelKey: 'idle.rail.thumbsUp', category: 'react', legacyLibNum: 20 },
  { railNum: 33, clipId: 'Cheer', labelKey: 'idle.rail.cheerOil', category: 'react', legacyLibNum: 22 },
  { railNum: 34, clipId: 'PlayPunch', labelKey: 'idle.rail.funnyCry', category: 'react', legacyLibNum: 108 },
  { railNum: 35, clipId: 'YesCheer', labelKey: 'idle.rail.hurray', category: 'react', legacyLibNum: 109 },
  { railNum: 36, clipId: 'TaDa', labelKey: 'idle.rail.scaredMad', category: 'react', legacyLibNum: 110 },
  { railNum: 37, clipId: 'Bow', labelKey: 'idle.rail.bow', category: 'react', legacyLibNum: 111 },
  { railNum: 38, clipId: 'StompAngry', labelKey: 'idle.rail.fistsAngry', category: 'react', legacyLibNum: 112 },
  { railNum: 39, clipId: 'lib_C146', labelKey: 'idle.rail.coverHeadJab', category: 'react', legacyLibNum: 117 },
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

/** Default ON rotation: curated #1+#2 (calm pair). */
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
