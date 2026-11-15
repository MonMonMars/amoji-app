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

/**
 * Idle v6 default clip id — owner-verify after hard refresh + clear site data.
 * Visibly different from RPM F/M stands (#415/#422) that still looked "the same".
 */
export const DEFAULT_IDLE_CLIP_ID = 'IdleQuaterniusHuman';

/** Never fall back to BreathCalm / Sassy / RPM stands — those are owner-bad forever. */
export const IDLE_PIN_FALLBACK_CLIP_ID = DEFAULT_IDLE_CLIP_ID;

/**
 * Truly toxic — always remap away (sky-look / BreathCalm / Sassy / etc.).
 * Never play these even when somehow stored.
 */
export const TOXIC_IDLE_CLIP_IDS = new Set<string>([
  'IdleBreathCalm',
  'IdleSassy',
  'StandardIdle',
  'IdleRpmMVar001', // sudden sky-look
]);

/**
 * Banned from *auto* default pools (fresh install → Quaternius), but
 * still playable when the owner pinned/enabled them (#432 / #430 conflict).
 * resolveIdleClipId must NOT remap these to Quaternius.
 */
export const OWNER_HONORABLE_STAND_CLIP_IDS = new Set<string>([
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
]);

/**
 * Union used by isBannedAutoIdleClip / isPixelCalmIdleClip.
 * Auto banks skip these; owner pin/enable paths still play honorable stands.
 */
export const BANNED_AUTO_IDLE_CLIP_IDS = new Set<string>([
  ...TOXIC_IDLE_CLIP_IDS,
  ...OWNER_HONORABLE_STAND_CLIP_IDS,
]);

/**
 * Calm stands used for chat idle / relaxed hands (not sing/dance/react).
 * Keep in sync with `chat-auto-idle` neutral/talk calm banks.
 * v6 default is Quaternius human stand (near-still amp); RPM stands banned from auto.
 */
export const PIXEL_CALM_IDLE_CLIP_IDS = new Set<string>([
  'IdleQuaterniusHuman',
  'IdleMixamoBreathing',
  'IdleInnersceneSam',
  'IdleRpmFVar001',
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

export function isToxicIdleClip(clipId: string | null | undefined): boolean {
  if (!clipId) return false;
  return TOXIC_IDLE_CLIP_IDS.has(clipId);
}

export function isOwnerHonorableStand(clipId: string | null | undefined): boolean {
  if (!clipId) return false;
  return OWNER_HONORABLE_STAND_CLIP_IDS.has(clipId);
}

/** @deprecated alias — pose-blend callers */
export const OWNER_HONORABLE_BANNED_AUTO = OWNER_HONORABLE_STAND_CLIP_IDS;

export function isOwnerHonorableBannedAuto(clipId: string | null | undefined): boolean {
  return isOwnerHonorableStand(clipId);
}

/**
 * Remap toxic / retired / farewell → Quaternius.
 * Owner-honorable RPM stands stay as-is so #430 Quaternius default cannot
 * override migrated pins/enables (#432 strengthen).
 */
export function resolveIdleClipId(clipId: string): string {
  if (
    isRetiredIdleClip(clipId)
    || isFarewellOnlyIdleClip(clipId)
    || isToxicIdleClip(clipId)
  ) {
    return IDLE_PIN_FALLBACK_CLIP_ID;
  }
  return clipId;
}

/**
 * Mixer play path. Owner-honorable stands always keep (same as resolveIdleClipId).
 * `honorOwnerPin` retained for pose-blend call sites; toxic still remaps.
 */
export function resolveIdleClipForPlay(
  clipId: string,
  _opts?: { honorOwnerPin?: boolean },
): string {
  return resolveIdleClipId(clipId);
}
