import * as THREE from 'three';

/**
 * Human-feasible local Euler (YXZ) limits for bones we blend or cast-correct.
 * Radians; applied after mixer / crossfade writes so library clips keep freedom upstream.
 */
export type EulerLimit = readonly [min: number, max: number];

export interface BoneEulerLimitsYXZ {
  readonly x: EulerLimit;
  readonly y: EulerLimit;
  readonly z: EulerLimit;
}

/** Documented caps — spine / head / hip / elbow (approx deg ≈ rad × 57.3). */
export const BONE_BLEND_LIMITS: Readonly<Record<string, BoneEulerLimitsYXZ>> = {
  head: { x: [-0.6, 0.5], y: [-1.1, 1.1], z: [-0.55, 0.55] },
  neck: { x: [-0.45, 0.45], y: [-0.95, 0.95], z: [-0.4, 0.4] },
  spine: { x: [-0.45, 0.4], y: [-0.55, 0.55], z: [-0.35, 0.35] },
  chest: { x: [-0.35, 0.3], y: [-0.45, 0.45], z: [-0.4, 0.4] },
  upperChest: { x: [-0.3, 0.28], y: [-0.4, 0.4], z: [-0.35, 0.35] },
  hips: { x: [-0.35, 0.35], y: [-0.5, 0.5], z: [-0.28, 0.28] },
  leftUpperArm: { x: [-1.9, 1.9], y: [-0.8, 0.8], z: [-2.9, 1.6] },
  rightUpperArm: { x: [-1.9, 1.9], y: [-0.8, 0.8], z: [-1.6, 2.9] },
  leftLowerArm: { x: [-0.1, 2.4], y: [-0.6, 0.6], z: [-0.6, 0.6] },
  rightLowerArm: { x: [-0.1, 2.4], y: [-0.6, 0.6], z: [-0.6, 0.6] },
} as const;

const _e = new THREE.Euler(0, 0, 0, 'YXZ');

const clamp = (v: number, [lo, hi]: EulerLimit): number =>
  v < lo ? lo : v > hi ? hi : v;

export function boneEulerLimits(boneName: string): BoneEulerLimitsYXZ | undefined {
  return BONE_BLEND_LIMITS[boneName];
}

/** Clamp a local quaternion to anatomy (YXZ). Mutates `q`. */
export function clampBoneQuaternionYXZ(q: THREE.Quaternion, limits: BoneEulerLimitsYXZ): void {
  _e.setFromQuaternion(q, 'YXZ');
  _e.x = clamp(_e.x, limits.x);
  _e.y = clamp(_e.y, limits.y);
  _e.z = clamp(_e.z, limits.z);
  q.setFromEuler(_e);
}
