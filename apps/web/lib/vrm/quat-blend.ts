import * as THREE from 'three';
import { boneEulerLimits, clampBoneQuaternionYXZ } from './bone-joint-limits';

const _align = new THREE.Quaternion();

/** Quaternion dot product (same sign ⇒ same hemisphere). */
export function quatDot(a: THREE.Quaternion, b: THREE.Quaternion): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

/**
 * Copy `q` into `out`, negating if needed so `ref·out ≥ 0`.
 * Stops mixer targets from jumping q ↔ −q between frames during crossfade.
 */
export function quatAlignHemisphere(
  ref: THREE.Quaternion,
  q: THREE.Quaternion,
  out: THREE.Quaternion = _align,
): THREE.Quaternion {
  out.copy(q);
  if (quatDot(ref, out) < 0) {
    out.x = -out.x;
    out.y = -out.y;
    out.z = -out.z;
    out.w = -out.w;
  }
  return out;
}

/**
 * Spherical interpolation along the shortest arc (hemisphere-align target to source).
 */
export function shortestQuatSlerp(
  dst: THREE.Quaternion,
  from: THREE.Quaternion,
  to: THREE.Quaternion,
  t: number,
): THREE.Quaternion {
  return dst.copy(from).slerp(quatAlignHemisphere(from, to, _align), t);
}

/** After slerp, optionally clamp named bone to {@link boneEulerLimits}. */
export function shortestQuatSlerpClamped(
  dst: THREE.Quaternion,
  from: THREE.Quaternion,
  to: THREE.Quaternion,
  t: number,
  boneName?: string,
): THREE.Quaternion {
  shortestQuatSlerp(dst, from, to, t);
  const limits = boneName ? boneEulerLimits(boneName) : undefined;
  if (limits) clampBoneQuaternionYXZ(dst, limits);
  return dst;
}
