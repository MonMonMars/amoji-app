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

/** Never fall back to BreathCalm / Sassy — those are owner-bad forever. */
export const IDLE_PIN_FALLBACK_CLIP_ID = 'IdleRpmFStanding001';

/**
 * Clips that must never return via defaults, auto-idle, or pin remap.
 * Still may exist as manual rail rows until a catalog scrub, but resolve /
 * auto paths remap away from them.
 */
export const BANNED_AUTO_IDLE_CLIP_IDS = new Set<string>([
  'IdleBreathCalm',
  'IdleSassy',
  'StandardIdle',
  'IdleRpmMVar001', // sudden sky-look
]);

/**
 * Calm stands used for chat idle / relaxed hands (not sing/dance/react).
 * Keep in sync with `chat-auto-idle` neutral/talk calm banks.
 * v5 default is a single upright RPM stand; BreathCalm/Sassy stay banned.
 */
export const PIXEL_CALM_IDLE_CLIP_IDS = new Set<string>([
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
  'IdleRpmFVar001',
  'IdleMixamoBreathing',
  'IdleInnersceneSam',
  'IdleRpmFVar003',
  'IdleRpmFVar004',
  'IdleRpmMVar002',
  'Thinking',
]);

export function isRetiredIdleNum(num: number): boolean {
  return RETIRED_IDLE_NUMS.has(num);
}

export function isRetiredIdleClip(clipId: string): boolean {
  return RETIRED_IDLE_CLIP_IDS.has(clipId);
}

/** True for standing/talk calm idles — relaxed hands + torso upright gate. */
export function isPixelCalmIdleClip(clipId: string | null | undefined): boolean {
  if (!clipId) return false;
  if (isRetiredIdleClip(clipId) || isFarewellOnlyIdleClip(clipId)) return false;
  if (BANNED_AUTO_IDLE_CLIP_IDS.has(clipId)) return false;
  return PIXEL_CALM_IDLE_CLIP_IDS.has(clipId);
}

export function isBannedAutoIdleClip(clipId: string | null | undefined): boolean {
  if (!clipId) return false;
  return BANNED_AUTO_IDLE_CLIP_IDS.has(clipId);
}

export function resolveIdleClipId(clipId: string): string {
  if (
    isRetiredIdleClip(clipId)
    || isFarewellOnlyIdleClip(clipId)
    || isBannedAutoIdleClip(clipId)
  ) {
    return IDLE_PIN_FALLBACK_CLIP_ID;
  }
  return clipId;
}
