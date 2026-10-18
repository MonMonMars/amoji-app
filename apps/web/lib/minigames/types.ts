// Shared types for the v1 action mini-games (Tag + Lane Dodge).
// Kinematic only — no physics library. Client-side, no LLM during a round.

import type { EmotionId } from '@amoji/emotion-core';

export type ActionGame = 'tag' | 'lane';

export type GamePhase = 'countdown' | 'playing' | 'result';

/** Body states the VRM mixer maps onto whatever VRMA clips are loaded. */
export type GameAnim = 'idle' | 'run' | 'dash' | 'tease' | 'caught' | 'crash' | 'win_pose' | 'pout';

export type MiniEmotionKind =
  | 'near_miss'
  | 'catch'
  | 'timeout'
  | 'lane_near_miss'
  | 'crash'
  | 'survive'
  | 'quit';

export type EmotionHints = Partial<Record<EmotionId, number>>;

export interface MiniEmotionEvent {
  kind: MiniEmotionKind;
  hints: EmotionHints;
  anim: GameAnim;
}

export interface FaceExpr {
  happy?: number;
  angry?: number;
  sad?: number;
  surprised?: number;
  relaxed?: number;
  blink?: number;
  blinkLeft?: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface StageObstacle {
  id: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

/** What CompanionCanvas reads each frame. The sim publishes this; the canvas does not own the rules. */
export interface MiniGameView {
  kind: ActionGame;
  phase: GamePhase;
  vrmX: number;
  vrmZ: number;
  vrmYaw: number;
  anim: GameAnim;
  expr: FaceExpr;
  camX: number;
  camY: number;
  camZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  /** Soft follow uses CAM_LERP. Reduced motion snaps to a fixed rig. */
  camFollow: boolean;
  marker: { x: number; z: number; yaw: number } | null;
  obstacles: StageObstacle[];
}
