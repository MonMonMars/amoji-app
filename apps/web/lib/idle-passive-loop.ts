// Passive idle body while the user is quiet:
//   single near-still Quaternius stand (v6) — not RPM F (still looked same-bad).
// Never HelloWave / dance / look / stretch / BreathCalm / Sassy / RPM stands —

import { DEFAULT_IDLE_CLIP_ID } from './idle-retired';
import { idleClipById } from './idle-clips';

/** Upright chat stand priority — first match wins (no multi-idle rotation). */
export const PASSIVE_RELAX_CLIPS = [
  'IdleInnersceneSam',
  DEFAULT_IDLE_CLIP_ID,
  'IdleRpmMStanding001',
  'IdleRpmFStanding001',
  'IdleMixamoBreathing',
] as const;
/** Stretch stays out of the default passive loop. */
export const PASSIVE_STRETCH_CLIPS = [] as const;
/** Look variants stay out of the default passive loop. */
export const PASSIVE_LOOK_CLIPS = [] as const;

/**
 * Canonical playlist: one near-still calm stand — Quaternius, not RPM F.
 */
export const PASSIVE_IDLE_LOOP_TEMPLATE = [
  ...PASSIVE_RELAX_CLIPS,
] as const;

function firstAvailable(candidates: readonly string[], available: ReadonlySet<string>): string | null {
  for (const id of candidates) {
    if (available.has(id) && idleClipById(id)?.playable !== false) return id;
  }
  for (const id of candidates) {
    if (available.has(id)) return id;
  }
  return null;
}

/** Build the looping order from whatever clips actually loaded. */
export function orderPassiveIdleClips(availableIds: readonly string[]): string[] {
  const available = new Set(availableIds);
  const relaxA = firstAvailable(PASSIVE_RELAX_CLIPS, available);
  if (relaxA) return [relaxA];

  const calm = PASSIVE_RELAX_CLIPS.filter((id) => available.has(id));
  if (calm.length) return [...calm];
  const standing = availableIds.filter((id) => /Standing|Quaternius|Human/i.test(id) && !/Rpm[FM]/i.test(id));
  if (standing[0]) return [standing[0]];
  return availableIds.slice(0, 1);
}

/** Next clip in the loop (for ChatPanel silence cycling). */
export function nextPassiveIdleClip(availableIds: readonly string[], step: number): string {
  const order = orderPassiveIdleClips(availableIds);
  if (!order.length) return DEFAULT_IDLE_CLIP_ID;
  return order[((step % order.length) + order.length) % order.length]!;
}

/** True when this clip is part of the calm passive rotation (not a performance). */
export function isPassiveIdleClip(clipId: string): boolean {
  return (
    (PASSIVE_RELAX_CLIPS as readonly string[]).includes(clipId)
    || (PASSIVE_STRETCH_CLIPS as readonly string[]).includes(clipId)
    || (PASSIVE_LOOK_CLIPS as readonly string[]).includes(clipId)
  );
}
