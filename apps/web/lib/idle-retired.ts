// Retired idle # / clipId — no imports from curated rail or pixel review (breaks cycles).

import { isFarewellOnlyIdleClip } from './idle-farewell';
import { idleByClipId, idleByNum } from './idle-library';

/**
 * Pixel Designer explicit OK list (library #).
 * IdleHug (#36) was OK for singing first pass, then rejected for blend-to-back.
 */
export const PIXEL_OK_IDLE_NUMS = new Set([
  3, 20, 22, 34, 41, 42, 53, 94, 95, 101, 102, 103, 108, 109, 113, 114,
]);

/**
 * Pixel OK + suitable for *standing idle / talk* (breathe, look, think, mild stretch).
 * Dance / sing / react / martial stay in PIXEL_OK but are content/move-only.
 */
export const PIXEL_CALM_IDLE_NUMS = new Set([
  3, 34, 42, 53, 94, 95,
]);

/**
 * Pixel OK performance poses — only when the move matches (sing/dance/react/martial).
 */
export const PIXEL_PERF_OK_NUMS = new Set([
  20, 22, 41, 101, 102, 103, 108, 109, 113, 114,
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

/** Calm Pixel-OK stand — safe fallback for idle / talk. */
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

export function isPixelCalmIdleNum(num: number): boolean {
  return PIXEL_CALM_IDLE_NUMS.has(num);
}

export function isPixelCalmIdleClip(clipId: string): boolean {
  const row = idleByClipId(clipId);
  return !!row && PIXEL_CALM_IDLE_NUMS.has(row.num) && !row.retired && !RETIRED_IDLE_NUMS.has(row.num);
}

export function isPixelPerfOkClip(clipId: string): boolean {
  const row = idleByClipId(clipId);
  return !!row && PIXEL_PERF_OK_NUMS.has(row.num) && !row.retired && !RETIRED_IDLE_NUMS.has(row.num);
}

/**
 * Standing idle / talk: only calm Pixel-OK.
 * Performance OK clips (sing/dance/react) pass through for content moves.
 * Everything else → calm fallback.
 */
export function resolveIdleClipId(clipId: string): string {
  if (isRetiredIdleClip(clipId) || isFarewellOnlyIdleClip(clipId)) {
    return IDLE_PIN_FALLBACK_CLIP_ID;
  }
  const row = idleByClipId(clipId);
  if (!row) return clipId;
  if (PIXEL_CALM_IDLE_NUMS.has(row.num) || PIXEL_PERF_OK_NUMS.has(row.num)) return clipId;
  return IDLE_PIN_FALLBACK_CLIP_ID;
}

/** Force calm for passive / talk paths that must never dance or cheer. */
export function resolveCalmIdleClipId(clipId: string): string {
  if (isPixelCalmIdleClip(clipId)) return clipId;
  return IDLE_PIN_FALLBACK_CLIP_ID;
}
