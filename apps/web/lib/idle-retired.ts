// Retired idle # / clipId — no imports from curated rail or pixel review (breaks cycles).

import { isFarewellOnlyIdleClip } from './idle-farewell';
import { idleByClipId, idleByNum } from './idle-library';

/**
 * Pixel Designer explicit OK list (library #).
 * Chat rail + idle rotation + pins only use these. IdleHug (#36) was OK for
 * singing in the first pass, then rejected for blend-to-back — stay retired.
 */
export const PIXEL_OK_IDLE_NUMS = new Set([
  3, 20, 22, 34, 41, 42, 53, 94, 95, 101, 102, 103, 108, 109, 113, 114,
]);

/**
 * #N hidden from picker; no rotation; saved pins remap.
 * Includes Pixel DELETE / bad / blend-bad poses.
 */
export const RETIRED_IDLE_NUMS = new Set([
  // Pixel DELETE / bad (1–59)
  9, 11, 14, 21, 24, 25, 26, 35, 36, 37, 38, 39, 47, 48, 54, 55, 56, 57, 58, 59,
  // Pixel bad (94–118)
  96, 97, 98, 99, 100, 105, 106, 107,
]);

export const RETIRED_IDLE_CLIP_IDS = new Set(
  [...RETIRED_IDLE_NUMS]
    .map((n) => idleByNum(n)?.clipId)
    .filter((id): id is string => !!id),
);

/** Calm Pixel-OK stand — replaces IdleBreathCalm as safe fallback. */
export const IDLE_PIN_FALLBACK_CLIP_ID = 'IdleRpmFStanding001';

export function isRetiredIdleNum(num: number): boolean {
  return RETIRED_IDLE_NUMS.has(num);
}

export function isRetiredIdleClip(clipId: string): boolean {
  return RETIRED_IDLE_CLIP_IDS.has(clipId);
}

export function isPixelOkIdleNum(num: number): boolean {
  return PIXEL_OK_IDLE_NUMS.has(num);
}

export function isPixelOkIdleClip(clipId: string): boolean {
  const row = idleByClipId(clipId);
  return !!row && PIXEL_OK_IDLE_NUMS.has(row.num) && !row.retired && !RETIRED_IDLE_NUMS.has(row.num);
}

/** Idle library clips that are not Pixel-OK (or retired / farewell) → OK fallback. */
export function resolveIdleClipId(clipId: string): string {
  if (isRetiredIdleClip(clipId) || isFarewellOnlyIdleClip(clipId)) {
    return IDLE_PIN_FALLBACK_CLIP_ID;
  }
  const row = idleByClipId(clipId);
  if (row && !PIXEL_OK_IDLE_NUMS.has(row.num)) {
    return IDLE_PIN_FALLBACK_CLIP_ID;
  }
  return clipId;
}
