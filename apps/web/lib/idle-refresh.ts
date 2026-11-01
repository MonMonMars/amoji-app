/** Periodic soft re-play of the current idle VRMA to stop joint drift. */

/** Re-blend the active idle about this often while it keeps looping. */
export const IDLE_JOINT_REFRESH_MS = 28_000;

/** Fade used for a same-clip refresh (long enough to hide the rebind). */
export const IDLE_JOINT_REFRESH_FADE_S = 0.95;

/**
 * True when the idle loop should soft-restart.
 * Busy = performance clip, poke window, grab, or mini-game owns the body.
 */
export function shouldRefreshIdleJoints(
  nowMs: number,
  refreshAtMs: number,
  busy: boolean,
): boolean {
  return !busy && nowMs >= refreshAtMs;
}

/** Next refresh deadline after a play or soft restart. */
export function nextIdleRefreshAt(nowMs: number, periodMs = IDLE_JOINT_REFRESH_MS): number {
  return nowMs + Math.max(8_000, periodMs);
}
