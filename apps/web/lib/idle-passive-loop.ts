// Passive idle body while the user is quiet:
//   single calm upright RPM stand (v5) — no A→B F/M swaps.
// Never HelloWave / dance / look / stretch / BreathCalm / Sassy here —
// those stay farewell / explicit-intent / manual rail picks only.

import { idleClipById } from './idle-clips';

/** Preferred clip ids — one upright planted stand only (no rotation thrash). */
export const PASSIVE_RELAX_CLIPS = [
  'IdleRpmFStanding001',
] as const;
/** Stretch stays out of the default passive loop. */
export const PASSIVE_STRETCH_CLIPS = [] as const;
/** Look variants stay out of the default passive loop. */
export const PASSIVE_LOOK_CLIPS = [] as const;

/**
 * Canonical playlist: one static calm stand — no F↔M crossfade ruin.
 */
export const PASSIVE_IDLE_LOOP_TEMPLATE = [
  'IdleRpmFStanding001',
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
  const standing = availableIds.filter((id) => /Standing/i.test(id));
  if (standing[0]) return [standing[0]];
  return availableIds.slice(0, 1);
}

/** Next clip in the loop (for ChatPanel silence cycling). */
export function nextPassiveIdleClip(availableIds: readonly string[], step: number): string {
  const order = orderPassiveIdleClips(availableIds);
  if (!order.length) return 'IdleRpmFStanding001';
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
