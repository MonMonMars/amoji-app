// Stage props (r2026-10-04.69) — when the dialogue turns to singing,
// piano, violin, snacking or fine dining, the STAGE answers too: a real
// prop fades in next to the character for exactly as long as her
// performance runs. Master Simon's ask: "prepare some props and movement —
// piano and violin etc., mic stand, ice cream model and eating movements,
// trigger when user talks about it." The triggers already live in
// moves.ts (detectMove on her reply); this catalog only decides WHAT
// appears. Pure data + math, no DOM / no three imports — CompanionCanvas
// turns each part into meshes. Scene space: character stands at the origin
// facing +Z (toward the camera at HOME), ~1.5m tall, ground at y=0.
// r.69: five props — micStand (sing), piano (piano), violin (violin),
// iceCream (eat), dineTable (dine). Each part carries a micro-animation
// hook so the prop feels alive (keys ripple, treat bobs, bow sways).

import type { MoveKind } from './moves';

export type PropPartKind = 'box' | 'cylinder' | 'sphere' | 'cone';

/** per-frame micro animation, sampled by CompanionCanvas with `now` ms */
export type PropAnim = 'none' | 'pianoKeys' | 'softBob' | 'sway' | 'sparkle';

export interface PropPart {
  kind: PropPartKind;
  /** center position, meters, scene space */
  pos: [number, number, number];
  /**
   * box: [width, height, depth] · cylinder: [rTop, rBottom, height]
   * sphere: [radius, -, -] · cone: [radius, height, radius]
   * (unused slots carry a mirrored placeholder so geometry stays positive)
   */
  size: [number, number, number];
  color: string; // '#rrggbb'
  /** euler rotation radians, optional */
  rot?: [number, number, number];
  anim?: PropAnim;
  /** phase offset so animated parts don't move in lockstep */
  animPhase?: number;
}

export interface PropDef {
  id: string;
  /** the move kinds this prop appears for */
  forMoves: MoveKind[];
  parts: PropPart[];
}

const HEX = (s: string): string => s;

export const PROPS: PropDef[] = [
  {
    // the singer's mic — rises in front of her free hand while she sings
    id: 'micStand',
    forMoves: ['sing'],
    parts: [
      { kind: 'cylinder', pos: [0.3, 0.015, 0.42], size: [0.16, 0.18, 0.03], color: HEX('#111827') },
      { kind: 'cylinder', pos: [0.3, 0.65, 0.42], size: [0.012, 0.014, 1.27], color: HEX('#374151') },
      { kind: 'cylinder', pos: [0.3, 1.27, 0.42], size: [0.02, 0.02, 0.09], color: HEX('#4b5563'), rot: [0.5, 0, 0] },
      { kind: 'sphere', pos: [0.3, 1.31, 0.385], size: [0.05, 0, 0], color: HEX('#1f2937'), anim: 'softBob', animPhase: 0.7 },
      { kind: 'sphere', pos: [0.3, 1.31, 0.385], size: [0.028, 0, 0], color: HEX('#f472b6'), anim: 'sparkle', animPhase: 0 },
    ],
  },
  {
    // a little glossy upright keyboard she sits down to play
    id: 'piano',
    forMoves: ['piano'],
    parts: [
      { kind: 'box', pos: [0, 0.68, 0.55], size: [1.1, 0.12, 0.34], color: HEX('#0f172a') },
      { kind: 'box', pos: [0, 0.748, 0.44], size: [1.0, 0.02, 0.1], color: HEX('#f8fafc') },
      { kind: 'box', pos: [-0.4, 0.72, 0.6], size: [0.05, 0.62, 0.05], color: HEX('#1e293b') },
      { kind: 'box', pos: [0.4, 0.72, 0.6], size: [0.05, 0.62, 0.05], color: HEX('#1e293b') },
      { kind: 'box', pos: [-0.36, 0.762, 0.452], size: [0.045, 0.02, 0.055], color: HEX('#111827'), anim: 'pianoKeys', animPhase: 0 },
      { kind: 'box', pos: [-0.18, 0.762, 0.452], size: [0.045, 0.02, 0.055], color: HEX('#111827'), anim: 'pianoKeys', animPhase: 1.3 },
      { kind: 'box', pos: [0, 0.762, 0.452], size: [0.045, 0.02, 0.055], color: HEX('#111827'), anim: 'pianoKeys', animPhase: 2.6 },
      { kind: 'box', pos: [0.18, 0.762, 0.452], size: [0.045, 0.02, 0.055], color: HEX('#111827'), anim: 'pianoKeys', animPhase: 3.9 },
      { kind: 'box', pos: [0.36, 0.762, 0.452], size: [0.045, 0.02, 0.055], color: HEX('#111827'), anim: 'pianoKeys', animPhase: 5.2 },
    ],
  },
  {
    // violin tucked at her left shoulder + bow in the right hand
    id: 'violin',
    forMoves: ['violin'],
    parts: [
      { kind: 'box', pos: [-0.21, 1.28, 0.12], size: [0.11, 0.3, 0.06], color: HEX('#7c2d12'), rot: [0.1, 0.35, -0.55], anim: 'sway', animPhase: 0 },
      { kind: 'box', pos: [-0.1, 1.42, 0.14], size: [0.03, 0.26, 0.03], color: HEX('#3f1d0b'), rot: [0.1, 0.35, -0.55] },
      { kind: 'sphere', pos: [-0.015, 1.52, 0.155], size: [0.022, 0, 0], color: HEX('#1c0f06') },
      { kind: 'box', pos: [0.32, 1.12, 0.18], size: [0.016, 0.5, 0.016], color: HEX('#d6c7a1'), rot: [0, 0, 0.5], anim: 'sway', animPhase: 1.6 },
    ],
  },
  {
    // double-scoop ice cream in her right hand — strawberry over vanilla
    id: 'iceCream',
    forMoves: ['eat'],
    parts: [
      { kind: 'cone', pos: [0.28, 1.02, 0.2], size: [0.05, 0.13, 0.05], color: HEX('#d97706'), rot: [Math.PI, 0, 0], anim: 'softBob', animPhase: 0 },
      { kind: 'sphere', pos: [0.28, 1.115, 0.2], size: [0.055, 0, 0], color: HEX('#fda4af'), anim: 'softBob', animPhase: 0 },
      { kind: 'sphere', pos: [0.28, 1.17, 0.2], size: [0.042, 0, 0], color: HEX('#fef3c7'), anim: 'softBob', animPhase: 0 },
      { kind: 'sphere', pos: [0.28, 1.207, 0.2], size: [0.016, 0, 0], color: HEX('#dc2626'), anim: 'softBob', animPhase: 0 },
    ],
  },
  {
    // a small round table set for two, with a sparkling glass
    id: 'dineTable',
    forMoves: ['dine'],
    parts: [
      { kind: 'cylinder', pos: [0, 0.62, 0.5], size: [0.3, 0.3, 0.035], color: HEX('#e2e8f0') },
      { kind: 'cylinder', pos: [0, 0.31, 0.5], size: [0.025, 0.03, 0.6], color: HEX('#64748b') },
      { kind: 'cylinder', pos: [0, 0.02, 0.5], size: [0.14, 0.16, 0.04], color: HEX('#64748b') },
      { kind: 'cylinder', pos: [0.13, 0.7, 0.5], size: [0.034, 0.027, 0.09], color: HEX('#bfdbfe'), anim: 'sparkle', animPhase: 0 },
      { kind: 'cylinder', pos: [-0.13, 0.685, 0.5], size: [0.045, 0.045, 0.06], color: HEX('#f1f5f9') },
    ],
  },
];

/** the props that should be on stage for a move (usually exactly one) */
export function propsForMove(kind: MoveKind | undefined): PropDef[] {
  if (!kind) return [];
  return PROPS.filter((p) => p.forMoves.includes(kind));
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * How visible a prop is at move progress t (0→1): pops in fast (attack
 * 0.06), holds full through the performance, then melts away across
 * 0.82→0.90 so the stage is CLEAR before she moves on to her next motion —
 * the prop never pops out mid-transition. Multiply into group scale —
 * 0 hides the group entirely.
 */
export function propPresence(t: number): number {
  const u = clamp01(t);
  return Math.min(clamp01(u / 0.06), clamp01((0.9 - u) / 0.08));
}
