// Pixel Designer review (2026-11-08): retired # + safe fallback for saved pins.

import { idleByNum } from './idle-library';

/** #N hidden from picker; no rotation; saved pins remap. */
export const RETIRED_IDLE_NUMS = new Set([
  14, 24, 25, 47, 48, 54, 55, 56, 57, 58, 59,
  // Pixel 2026-11-08 review batch #94–118
  96, 97, 98, 99, 100, 105, 106, 107,
]);

/** Pixel-reviewed keeps (#94–118); optional UI highlight later. */
export const PIXEL_IDLE_REVIEW_KEEPS: Readonly<
  Record<number, { note: string; highlight?: boolean }>
> = {
  94: { note: 'Look forward → sudden L/R upward (bird/plane)', highlight: true },
  95: { note: 'Neck stretch L/R', highlight: true },
  101: { note: 'Robot dance', highlight: true },
  102: { note: 'Finger point top, slow body swing — slow jazz concert', highlight: true },
  103: { note: 'Fast music arm swing — hip hop', highlight: true },
  104: { note: 'Jazz-like arm move; hands press front buttons', highlight: true },
  108: { note: 'Hands up, funny crying', highlight: true },
  109: { note: 'Big arm up hurray/yeah', highlight: true },
  110: { note: 'Scared → mad, hands on hip angry', highlight: true },
  111: { note: 'Head bow — sorry / JP bow', highlight: true },
  112: { note: 'Two fists up — add oil OR very angry', highlight: true },
  113: { note: 'Slow big arm dance — slow singing', highlight: true },
  114: { note: 'Tai chi / slow kung fu', highlight: true },
  115: { note: 'JP sword pull from waist, sheath back', highlight: true },
  116: { note: 'Sword front pull, point top', highlight: true },
  117: {
    note: 'Hands cover head; sudden L hand forward — keep; prefer subtle breath overlay if layered',
    highlight: true,
  },
  118: {
    note: 'Same as #117 (identical catalog treatment) — subtle breath if breath layer applies',
    highlight: true,
  },
};

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
