// Shared upper-body home framing for every cast member.
// Look-at sits between chest and head; distance scales with torso span
// so short and tall VRMs share the same normal portrait view.
// lookX tracks the torso so residual side-bend / off-center roots still
// frame the body (not empty stage). Double-tap reset must reuse the same
// per-cast dist - see CompanionCanvas homeDist.

export interface BoneY {
  hipsY: number;
  chestY: number;
  headY: number;
  /** World X of hips; optional - defaults lookX to 0. */
  hipsX?: number;
  /** World X of chest/spine; blended with hipsX when both present. */
  chestX?: number;
}

export interface CameraHome {
  lookX: number;
  lookY: number;
  dist: number;
}

/** Default when bones are missing - matches the historic CompanionCanvas home. */
export const DEFAULT_CAMERA_HOME: CameraHome = { lookX: 0, lookY: 1.05, dist: 2.6 };

/**
 * Upper-body framing from hips / chest / head world Y (and optional X).
 * lookY - upper chest; dist keeps head-hips in a similar vertical FOV.
 * lookX - torso mid X, lightly clamped so a leaning cast stays centered.
 */
export function upperBodyHome(bones: BoneY): CameraHome {
  const span = Math.max(0.35, bones.headY - bones.hipsY);
  const chest = Number.isFinite(bones.chestY) ? bones.chestY : bones.hipsY + span * 0.55;
  const lookY = clamp(chest * 0.45 + bones.headY * 0.55, 0.75, 1.35);
  const dist = clamp(span * 3.25, 2.15, 3.45);
  const hx = Number.isFinite(bones.hipsX) ? (bones.hipsX as number) : 0;
  const cx = Number.isFinite(bones.chestX) ? (bones.chestX as number) : hx;
  const lookX = clamp(hx * 0.55 + cx * 0.45, -0.22, 0.22);
  return { lookX, lookY, dist };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
