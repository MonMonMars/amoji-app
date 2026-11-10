import * as THREE from 'three';

/**
 * Human-feasible local Euler (YXZ) limits for bones we blend or cast-correct.
 * Radians; applied after mixer / crossfade writes so library clips keep freedom upstream
 * except for every-frame no-flip bones (spine / chest / neck / head / arms) which are
 * always clamped so library clips cannot spin a limb a full turn.
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
  hips: { x: [-0.35, 0.35], y: [-0.45, 0.45], z: [-0.28, 0.28] },
  // Upper-arm Z tightened from ±2.9 (~166°) so every-frame clamps stop scary
  // near-360 swings while still allowing dance / raise gestures (~115°).
  leftUpperArm: { x: [-1.9, 1.9], y: [-0.75, 0.75], z: [-2.0, 1.4] },
  rightUpperArm: { x: [-1.9, 1.9], y: [-0.75, 0.75], z: [-1.4, 2.0] },
  leftLowerArm: { x: [-0.1, 2.4], y: [-0.55, 0.55], z: [-0.55, 0.55] },
  rightLowerArm: { x: [-0.1, 2.4], y: [-0.55, 0.55], z: [-0.55, 0.55] },
  // Legs during idle A→B blend — caps stop ±350° thigh/knee wrap shakes.
  leftUpperLeg: { x: [-1.35, 1.2], y: [-0.65, 0.65], z: [-0.7, 0.7] },
  rightUpperLeg: { x: [-1.35, 1.2], y: [-0.65, 0.65], z: [-0.7, 0.7] },
  leftLowerLeg: { x: [-0.05, 2.45], y: [-0.35, 0.35], z: [-0.35, 0.35] },
  rightLowerLeg: { x: [-0.05, 2.45], y: [-0.35, 0.35], z: [-0.35, 0.35] },
} as const;

/**
 * Body / neck / arms — never allow a full turn. Clamped every frame after
 * mixer + poke/dance overlays, even when a library clip keys the bone.
 * Arms were blend-only before; scary 360° sleeve spins came from mixer keys
 * that never hit clampBoneByName outside idle crossfade.
 */
export const AXIAL_NO_FLIP_BONES = [
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftUpperArm',
  'rightUpperArm',
  'leftLowerArm',
  'rightLowerArm',
] as const;

export type AxialNoFlipBone = (typeof AXIAL_NO_FLIP_BONES)[number];

/** Raw / Normalized VRM names → semantic limit keys. */
const RAW_TO_SEMANTIC: Readonly<Record<string, string>> = {
  J_Bip_C_Hips: 'hips',
  J_Bip_C_Spine: 'spine',
  J_Bip_C_Chest: 'chest',
  J_Bip_C_UpperChest: 'upperChest',
  J_Bip_C_Neck: 'neck',
  J_Bip_C_Head: 'head',
  J_Bip_L_UpperArm: 'leftUpperArm',
  J_Bip_R_UpperArm: 'rightUpperArm',
  J_Bip_L_LowerArm: 'leftLowerArm',
  J_Bip_R_LowerArm: 'rightLowerArm',
  J_Bip_L_UpperLeg: 'leftUpperLeg',
  J_Bip_R_UpperLeg: 'rightUpperLeg',
  J_Bip_L_LowerLeg: 'leftLowerLeg',
  J_Bip_R_LowerLeg: 'rightLowerLeg',
  hips: 'hips',
  spine: 'spine',
  chest: 'chest',
  upperChest: 'upperChest',
  neck: 'neck',
  head: 'head',
  leftUpperArm: 'leftUpperArm',
  rightUpperArm: 'rightUpperArm',
  leftLowerArm: 'leftLowerArm',
  rightLowerArm: 'rightLowerArm',
  leftUpperLeg: 'leftUpperLeg',
  rightUpperLeg: 'rightUpperLeg',
  leftLowerLeg: 'leftLowerLeg',
  rightLowerLeg: 'rightLowerLeg',
};

const _e = new THREE.Euler(0, 0, 0, 'YXZ');

const clamp = (v: number, [lo, hi]: EulerLimit): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Wrap radians into (−π, π]. */
export function wrapAngleToPi(a: number): number {
  const twoPi = Math.PI * 2;
  let x = ((a + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (x <= -Math.PI) x += twoPi;
  return x;
}

/**
 * Shortest signed turn from `from` to `to` in (−π, π].
 * +170° → −170° is −20° (≈ −0.349), never −340°.
 */
export function shortestAngleDelta(from: number, to: number): number {
  return wrapAngleToPi(to - from);
}

/** Interpolate angles along the short arc, result wrapped to (−π, π]. */
export function lerpAngleShortest(from: number, to: number, t: number): number {
  return wrapAngleToPi(from + shortestAngleDelta(from, to) * t);
}

/**
 * Map a bone Object3D.name or semantic humanoid id onto a BONE_BLEND_LIMITS key.
 * VRM 1.0 normalized nodes are `Normalized_<raw>` (e.g. Normalized_J_Bip_C_Spine).
 */
export function resolveBoneLimitKey(boneName: string): string | undefined {
  if (!boneName) return undefined;
  if (BONE_BLEND_LIMITS[boneName]) return boneName;
  let raw = boneName;
  if (raw.startsWith('Normalized_')) raw = raw.slice('Normalized_'.length);
  if (BONE_BLEND_LIMITS[raw]) return raw;
  const mapped = RAW_TO_SEMANTIC[raw];
  if (mapped && BONE_BLEND_LIMITS[mapped]) return mapped;
  return undefined;
}

export function boneEulerLimits(boneName: string): BoneEulerLimitsYXZ | undefined {
  const key = resolveBoneLimitKey(boneName);
  return key ? BONE_BLEND_LIMITS[key] : undefined;
}

/** Clamp a local quaternion to anatomy (YXZ). Mutates `q`. Wraps first so ±π edges do not flip. */
export function clampBoneQuaternionYXZ(q: THREE.Quaternion, limits: BoneEulerLimitsYXZ): void {
  _e.setFromQuaternion(q, 'YXZ');
  _e.x = clamp(wrapAngleToPi(_e.x), limits.x);
  _e.y = clamp(wrapAngleToPi(_e.y), limits.y);
  _e.z = clamp(wrapAngleToPi(_e.z), limits.z);
  q.setFromEuler(_e);
}

/** Resolve limits from any name form and clamp. Returns true if a limit was applied. */
export function clampBoneByName(q: THREE.Quaternion, boneName: string): boolean {
  const limits = boneEulerLimits(boneName);
  if (!limits) return false;
  clampBoneQuaternionYXZ(q, limits);
  return true;
}

/**
 * Hard stop for 360° body/arm/neck flips — call once per frame after
 * mixer, applyPose, poke overlays, idle crossfade, and cast fixes.
 */
export function clampAxialNoFlipBones(
  getBone: (name: string) => THREE.Object3D | null | undefined,
): void {
  for (const name of AXIAL_NO_FLIP_BONES) {
    const node = getBone(name);
    if (!node) continue;
    clampBoneByName(node.quaternion, name);
  }
}
