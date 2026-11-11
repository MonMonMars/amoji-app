// Retired idle # / clipId — no imports from curated rail or pixel review (breaks cycles).

import { isFarewellOnlyIdleClip } from './idle-farewell';
import { idleByNum } from './idle-library';

/**
 * #N hidden from picker; no rotation; saved pins remap.
 * Includes Pixel blend-bad deletes (lean-wall, pointing, UAL talking, ninja,
 * IdleHug lean that spun the torso through the back on A→B).
 */
export const RETIRED_IDLE_NUMS = new Set([
  14, 24, 25, 36, 47, 48, 54, 55, 56, 57, 58, 59,
  96, 97, 98, 99, 100, 105, 106, 107,
]);

export const RETIRED_IDLE_CLIP_IDS = new Set(
  [...RETIRED_IDLE_NUMS]
    .map((n) => idleByNum(n)?.clipId)
    .filter((id): id is string => !!id),
);

export const IDLE_PIN_FALLBACK_CLIP_ID = 'IdleBreathCalm';

export function isRetiredIdleNum(num: number): boolean {
  return RETIRED_IDLE_NUMS.has(num);
}

export function isRetiredIdleClip(clipId: string): boolean {
  return RETIRED_IDLE_CLIP_IDS.has(clipId);
}

export function resolveIdleClipId(clipId: string): string {
  if (isRetiredIdleClip(clipId) || isFarewellOnlyIdleClip(clipId)) return IDLE_PIN_FALLBACK_CLIP_ID;
  return clipId;
}
