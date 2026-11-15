// Passive idle body rotation while the user is quiet:
//   upright planted RPM stands only (v4).
// Never HelloWave / dance / look / stretch / big arm-raise here —
// those stay farewell / explicit-intent / manual rail picks only.

import { idleClipById } from './idle-clips';

/** Preferred clip ids for each beat of the loop — cleaner upright stands only. */
export const PASSIVE_RELAX_CLIPS = [
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
] as const;
/** Stretch stays out of the default passive loop (v4 upright-only). */
export const PASSIVE_STRETCH_CLIPS = [] as const;
/** Look variants stay out of the default passive loop (v4 upright-only). */
export const PASSIVE_LOOK_CLIPS = [] as const;

/**
 * Canonical playlist: upright stands only — no look / stretch beats.
 */
export const PASSIVE_IDLE_LOOP_TEMPLATE = [
  'IdleRpmFStanding001',
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
  'IdleRpmFStanding001',
  'IdleRpmMStanding001',
  'IdleRpmFStanding001',
] as const;

function firstAvailable(candidates: readonly string[], available: ReadonlySet<string>): string | null {
  for (const id of candidates) {
    if (available.has(id) && idleClipById(id)?.playable !== false) return id;
  }
  // Fall back even if playable flag is missing but the clip loaded in the canvas.
  for (const id of candidates) {
    if (available.has(id)) return id;
  }
  return null;
}

/** Build the looping order from whatever clips actually loaded. */
export function orderPassiveIdleClips(availableIds: readonly string[]): string[] {
  const available = new Set(availableIds);
  const relaxA = firstAvailable(PASSIVE_RELAX_CLIPS, available);
  const stretch = firstAvailable(PASSIVE_STRETCH_CLIPS, available);
  const relaxB =
    firstAvailable(
      PASSIVE_RELAX_CLIPS.filter((id) => id !== relaxA),
      available,
    ) ?? relaxA;
  const look = firstAvailable(PASSIVE_LOOK_CLIPS, available);

  const loop: string[] = [];
  if (relaxA) {
    loop.push(relaxA, relaxA);
    if (relaxB) loop.push(relaxB);
    loop.push(relaxA);
  }
  if (look) loop.push(look);
  if (relaxA) loop.push(relaxA, relaxA);
  // Stretch once at the end of the calm cycle — never back-to-back arm raises.
  if (stretch) loop.push(stretch);

  if (loop.length >= 2) return loop;
  // Absolute fallback: whatever calm clips we have.
  const calm = PASSIVE_RELAX_CLIPS.filter((id) => available.has(id));
  return calm.length ? [...calm] : availableIds.slice(0, 2);
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
