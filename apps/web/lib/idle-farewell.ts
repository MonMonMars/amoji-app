// #15 HelloWave (StandingGreeting) — farewell wave only, never passive idle.

import { MOVE_TRIGGERS } from './moves';

/** Library clip id for the chest-up hand wave (pose #15). */
export const FAREWELL_WAVE_CLIP_ID = 'HelloWave';

export const FAREWELL_ONLY_IDLE_CLIP_IDS = new Set<string>([FAREWELL_WAVE_CLIP_ID]);

export function isFarewellOnlyIdleClip(clipId: string): boolean {
  return FAREWELL_ONLY_IDLE_CLIP_IDS.has(clipId);
}

/** Assistant or user line is an explicit goodbye (shared trigger with move performances). */
export function isFarewellText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return MOVE_TRIGGERS.goodbye.test(t);
}
