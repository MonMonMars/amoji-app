import * as THREE from 'three';
import {
  clampBoneByName,
  lerpAngleShortest,
  shortestAngleDelta,
  wrapAngleToPi,
} from './bone-joint-limits';

export { lerpAngleShortest, shortestAngleDelta, wrapAngleToPi };

const _align = new THREE.Quaternion();
const _eFrom = new THREE.Euler(0, 0, 0, 'YXZ');
const _eTo = new THREE.Euler(0, 0, 0, 'YXZ');
const _eOut = new THREE.Euler(0, 0, 0, 'YXZ');

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

/**
 * Euler (YXZ) blend along the short arc per axis — +170°→−170° travels 20°, not 340°.
 * Prefer {@link shortestQuatSlerp} for full orientations; this is for axis-angle pose fields.
 */
export function shortestEulerYXZSlerp(
  dst: THREE.Quaternion,
  from: THREE.Quaternion,
  to: THREE.Quaternion,
  t: number,
): THREE.Quaternion {
  _eFrom.setFromQuaternion(from, 'YXZ');
  _eTo.setFromQuaternion(quatAlignHemisphere(from, to, _align), 'YXZ');
  _eOut.set(
    lerpAngleShortest(_eFrom.x, _eTo.x, t),
    lerpAngleShortest(_eFrom.y, _eTo.y, t),
    lerpAngleShortest(_eFrom.z, _eTo.z, t),
    'YXZ',
  );
  return dst.setFromEuler(_eOut);
}

/** After slerp, optionally clamp named bone (semantic or Normalized_/J_Bip_*). */
export function shortestQuatSlerpClamped(
  dst: THREE.Quaternion,
  from: THREE.Quaternion,
  to: THREE.Quaternion,
  t: number,
  boneName?: string,
): THREE.Quaternion {
  shortestQuatSlerp(dst, from, to, t);
  if (boneName) clampBoneByName(dst, boneName);
  return dst;
}
