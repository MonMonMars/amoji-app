// Locked v1 numbers from the shortlist. Round length sits inside 45–60s.
// Catch radius sits inside 0.6–0.8 m. VRM flees at 0.85× the player's run speed.

export const TAG = {
  /** Half-extent of the 8×8 m pad. */
  half: 4,
  /** Bodies stop this far inside the pad so they don't ride the edge. */
  inset: 3.65,
  catchRadius: 0.7,
  nearMiss: 1.2,
  nearMissClear: 1.55,
  roundSec: 52,
  countdownSec: 3,
  playerSpeed: 3.4,
  dashSpeed: 6.4,
  dashSec: 0.22,
  dashCd: 1.2,
  vrmSpeedRatio: 0.85,
  zigEvery: 1.7,
  zigDur: 0.45,
} as const;

export const LANE = {
  count: 3,
  width: 1.25,
  roundSec: 52,
  countdownSec: 3,
  baseSpeed: 8,
  speedRamp: 0.06,
  hitHalf: 0.55,
  spacing: 8,
  spawnAhead: 22,
  laneLerp: 10,
} as const;

/** Soft third-person follow. Reduced motion does not use this. */
export const CAM_LERP = 0.1;

export function laneX(lane: 0 | 1 | 2): number {
  return (lane - 1) * LANE.width;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clampLane(v: number): 0 | 1 | 2 {
  if (v <= 0) return 0;
  if (v >= 2) return 2;
  return 1;
}
