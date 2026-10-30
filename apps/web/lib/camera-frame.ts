// Shared upper-body home framing for every cast member.
// Look-at sits between chest and head; distance scales with torso span
// so short and tall VRMs share the same normal portrait view.

export interface BoneY {
  hipsY: number;
  chestY: number;
  headY: number;
}

export interface CameraHome {
  lookY: number;
  dist: number;
}

/** Default when bones are missing — matches the historic CompanionCanvas home. */
export const DEFAULT_CAMERA_HOME: CameraHome = { lookY: 1.05, dist: 2.6 };

/**
 * Upper-body framing from hips / chest / head world Y.
 * lookY ≈ upper chest; dist keeps head→hips in a similar vertical FOV.
 */
export function upperBodyHome(bones: BoneY): CameraHome {
  const span = Math.max(0.35, bones.headY - bones.hipsY);
  const chest = Number.isFinite(bones.chestY) ? bones.chestY : bones.hipsY + span * 0.55;
  const lookY = clamp(chest * 0.45 + bones.headY * 0.55, 0.75, 1.35);
  const dist = clamp(span * 3.25, 2.15, 3.45);
  return { lookY, dist };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
