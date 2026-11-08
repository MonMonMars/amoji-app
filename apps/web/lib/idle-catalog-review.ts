// Pixel Designer review (2026-11-08): retired # + safe fallback for saved pins.

import { idleByNum } from './idle-library';

/** #N hidden from picker; no rotation; saved pins remap. */
export const RETIRED_IDLE_NUMS = new Set([
  14, 24, 25, 47, 48, 54, 55, 56, 57, 58, 59,
]);

/** Clips that must not stay pinned after catalog trim. */
export const RETIRED_IDLE_CLIP_IDS = new Set(
  [...RETIRED_IDLE_NUMS]
    .map((n) => idleByNum(n)?.clipId)
    .filter((id): id is string => !!id),
);

/** Nearest safe idle when a retired or unknown clip was saved. */
export const IDLE_PIN_FALLBACK_CLIP_ID = 'IdleBreathCalm';

export function isRetiredIdleNum(num: number): boolean {
  return RETIRED_IDLE_NUMS.has(num);
}

export function isRetiredIdleClip(clipId: string): boolean {
  return RETIRED_IDLE_CLIP_IDS.has(clipId);
}

export function resolveIdleClipId(clipId: string): string {
  if (isRetiredIdleClip(clipId)) return IDLE_PIN_FALLBACK_CLIP_ID;
  return clipId;
}
