// Map a game anim state onto VRMA clip ids the canvas has actually loaded.
// Missing clips fall through the candidate list, then to any standing idle.

import type { FaceExpr, GameAnim } from './types';

/** Preferred clip ids, first hit wins. Later names are fallbacks. */
const STANDING_IDLES = ['IdleBreathCalm', 'StandardIdle'] as const;

export const GAME_CLIP_CANDIDATES: Record<GameAnim, readonly string[]> = {
  idle: STANDING_IDLES,
  run: ['StandardIdle', 'IdleBreathCalm'],
  dash: ['Jump', 'WeightShift', 'StandardIdle'],
  tease: ['LookAround', 'Blush', 'Idea', 'IdleBreathCalm'],
  caught: ['Surprised', 'Cheer', 'Hello', 'Clapping'],
  crash: ['Scared', 'Sad', 'Bow', 'Goodbye'],
  win_pose: ['TaDa', 'Cheer', 'Clapping', 'YesCheer', 'Dance'],
  pout: ['Disdain', 'Sad', 'Blush', 'Relax'],
};

const LOOP: ReadonlySet<GameAnim> = new Set(['idle', 'run', 'dash', 'tease']);

export function resolveGameClip(
  anim: GameAnim,
  available: ReadonlySet<string>,
): { id: string; loop: boolean } | null {
  for (const id of GAME_CLIP_CANDIDATES[anim]) {
    if (available.has(id)) return { id, loop: LOOP.has(anim) };
  }
  for (const id of STANDING_IDLES) {
    if (available.has(id)) return { id, loop: true };
  }
  return null;
}

export function expressionFor(anim: GameAnim): FaceExpr {
  switch (anim) {
    case 'tease':
      return { happy: 0.82, blinkLeft: 0.95, relaxed: 0.15 };
    case 'caught':
      return { surprised: 0.92, happy: 0.12 };
    case 'crash':
      return { surprised: 0.55, sad: 0.62 };
    case 'win_pose':
      return { happy: 0.95 };
    case 'pout':
      return { sad: 0.72, angry: 0.32 };
    case 'dash':
      return { surprised: 0.4, happy: 0.38 };
    case 'run':
      return { happy: 0.22 };
    default:
      return { relaxed: 0.45 };
  }
}
