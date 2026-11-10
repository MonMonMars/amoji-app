// Passive idle body rotation while the user is quiet:
//   mostly calm breath/stand → occasional look → rare mild stretch
// Never HelloWave / dance / big arm-raise here — those stay farewell / explicit-intent only.

import { idleClipById } from './idle-clips';

/** Preferred clip ids for each beat of the loop. */
export const PASSIVE_RELAX_CLIPS = ['IdleBreathCalm', 'StandardIdle'] as const;
/** Mild stretch only — IdleMixamoArmStretch raised arms repeatedly and felt like a show. */
export const PASSIVE_STRETCH_CLIPS = ['Relax'] as const;
export const PASSIVE_LOOK_CLIPS = ['LookAround'] as const;

/**
 * Canonical playlist: calm-heavy with one look and one mild stretch per cycle.
 * Stretch sits last so arm motion is at most once per full rotation.
 */
export const PASSIVE_IDLE_LOOP_TEMPLATE = [
  'IdleBreathCalm',
  'IdleBreathCalm',
  'StandardIdle',
  'IdleBreathCalm',
  'LookAround',
  'IdleBreathCalm',
  'IdleBreathCalm',
  'Relax',
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
  if (!order.length) return 'IdleBreathCalm';
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
