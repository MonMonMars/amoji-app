'use client';
// Input policy for the overlapping card fans (ArcFan).
//
// The fans used to step on any pointer delta larger than 42px horizontally.
// A vertical page scroll always carries some sideways finger drift, so a
// single scroll could fire many steps — and each step used to start a greeting
// (owner report 2026-11-25: "many many hi and hello at the same time").
//
// Stepping is now only a drag whose sideways travel clearly dominates. A
// scroll stays a scroll; nothing on the voice path sees it.

/** One pointer-move worth of step intent, or 'none'. */
export type FanDragIntent = 'prev' | 'next' | 'none';

/** Sideways travel needed before a drag counts as a step. */
export const FAN_DRAG_THRESHOLD = 42;
/**
 * Horizontal travel must beat vertical travel by this factor. 1.2 keeps a
 * deliberate fast swipe working while a mostly-vertical scroll (with drift)
 * never steps.
 */
export const FAN_DRAG_DOMINANCE = 1.2;

export function fanDragIntent(
  dx: number,
  dy: number,
  threshold = FAN_DRAG_THRESHOLD,
  dominance = FAN_DRAG_DOMINANCE,
): FanDragIntent {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 'none';
  if (Math.abs(dx) < threshold) return 'none';
  if (Math.abs(dx) <= Math.abs(dy) * dominance) return 'none';
  // Drag left → next card, drag right → previous card (same as before).
  return dx < 0 ? 'next' : 'prev';
}
