// Planted feet. Idle and other non-locomotion clips bend the knees while the
// hips stay at standing height, so both soles hover (and a hip sway drags
// them sideways). Unless a walk or jump clip is playing, the hips stay at
// their rest pose and both ankles are solved onto one shared ground height
// — the lower rest contact — so neither foot floats or slides.

import * as THREE from 'three';

/** Clips that are allowed to lift and step. Everything else stays planted. */
const LOCOMOTION_CLIP_IDS = new Set(['Jump', 'Walk', 'Jog', 'Run']);

export function clipFreesFeet(clipId: string | null | undefined): boolean {
  return !!clipId && LOCOMOTION_CLIP_IDS.has(clipId);
}

/** One ground contact for both soles: the lower of the two rest heights. */
export function sharedGroundY(leftY: number, rightY: number): number {
  return Math.min(leftY, rightY);
}

export function boneNameFromTrack(trackName: string): string | null {
  const suffix = trackName.endsWith('.quaternion')
    ? '.quaternion'
    : trackName.endsWith('.position')
      ? '.position'
      : null;
  if (!suffix) return null;
  const path = trackName.slice(0, -suffix.length);
  if (path.includes('[') && path.endsWith(']')) {
    return path.slice(path.lastIndexOf('[') + 1, -1);
  }
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot + 1) : path;
}

export interface PlantRest {
  q: THREE.Quaternion;
  p: THREE.Vector3;
}

/**
 * Freeze hips + leg tracks on a non-locomotion clip so the mixer cannot
 * lift or slide the feet. Upper-body tracks are left untouched. Walk/jump
 * clips must not be passed here.
 */
export function pinPlantedClipTracks(
  clip: THREE.AnimationClip,
  rest: ReadonlyMap<string, PlantRest>,
): void {
  for (const track of clip.tracks) {
    const bone = boneNameFromTrack(track.name);
    if (!bone) continue;
    const spec = rest.get(bone);
    if (!spec) continue;
    const v = track.values;
    if (track.name.endsWith('.quaternion')) {
      for (let i = 0; i + 3 < v.length; i += 4) {
        v[i] = spec.q.x;
        v[i + 1] = spec.q.y;
        v[i + 2] = spec.q.z;
        v[i + 3] = spec.q.w;
      }
    } else if (track.name.endsWith('.position')) {
      for (let i = 0; i + 2 < v.length; i += 3) {
        v[i] = spec.p.x;
        v[i + 1] = spec.p.y;
        v[i + 2] = spec.p.z;
      }
    }
  }
}

const PLANT_BONE_NAMES = [
  'hips',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
] as const;

export function collectPlantRest(
  getBone: (name: string) => THREE.Object3D | null,
): Map<string, PlantRest> {
  const out = new Map<string, PlantRest>();
  for (const name of PLANT_BONE_NAMES) {
    const node = getBone(name);
    if (!node) continue;
    out.set(node.name, { q: node.quaternion.clone(), p: node.position.clone() });
  }
  return out;
}

interface LegPlant {
  upper: THREE.Object3D;
  lower: THREE.Object3D;
  foot: THREE.Object3D;
  toes: THREE.Object3D | null;
  upperPos: THREE.Vector3;
  lowerPos: THREE.Vector3;
  footPos: THREE.Vector3;
  /** ankle at rest, in the inner node's local space, already snapped to the shared ground */
  ankleLocal: THREE.Vector3;
  footInInner: THREE.Quaternion;
  toesLocal: THREE.Quaternion | null;
}

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _kneeT = new THREE.Vector3();
const _have = new THREE.Vector3();
const _want = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pw = new THREE.Quaternion();
const _delta = new THREE.Quaternion();
const _iq = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _targetL = new THREE.Vector3();
const _targetR = new THREE.Vector3();
const _hipW = new THREE.Vector3();
const _leanE = new THREE.Euler(0, 0, 0, 'XYZ');

/** Hip lean for a punch. Soles stay on the captured contact. */
export interface PlantLean {
  pitch: number;
  roll: number;
  shiftX: number;
  shiftZ: number;
}

function aimBoneAt(bone: THREE.Object3D, child: THREE.Object3D, targetWorld: THREE.Vector3): void {
  bone.updateMatrixWorld(true);
  bone.getWorldPosition(_vA);
  child.getWorldPosition(_vB);
  _have.copy(_vB).sub(_vA);
  _want.copy(targetWorld).sub(_vA);
  if (_have.lengthSq() < 1e-12 || _want.lengthSq() < 1e-12) return;
  _have.normalize();
  _want.normalize();
  if (_have.dot(_want) > 0.999999) return;
  _delta.setFromUnitVectors(_have, _want);
  const parent = bone.parent;
  if (parent) {
    parent.getWorldQuaternion(_pw);
    _q.copy(_pw).invert().multiply(_delta).multiply(_pw);
    bone.quaternion.premultiply(_q);
  } else {
    bone.quaternion.premultiply(_delta);
  }
  bone.updateMatrixWorld(true);
}

function solveLeg(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  foot: THREE.Object3D,
  target: THREE.Vector3,
  forward: THREE.Vector3,
): void {
  upper.updateMatrixWorld(true);
  const hip = upper.getWorldPosition(_vA);
  const knee = lower.getWorldPosition(_vB);
  const ankle = foot.getWorldPosition(_vC);
  const len1 = hip.distanceTo(knee);
  const len2 = knee.distanceTo(ankle);
  if (len1 < 1e-5 || len2 < 1e-5) return;
  const raw = hip.distanceTo(target);
  const dist = Math.min(Math.max(raw, Math.abs(len1 - len2) + 1e-4), len1 + len2 - 1e-4);
  _dir.copy(target).sub(hip);
  if (_dir.lengthSq() < 1e-12) return;
  _dir.normalize();

  _pole.copy(knee).sub(hip);
  const along = _dir.dot(_pole);
  _pole.addScaledVector(_dir, -along);
  if (_pole.lengthSq() < 1e-8) {
    _pole.copy(forward);
    _pole.addScaledVector(_dir, -_pole.dot(_dir));
    if (_pole.lengthSq() < 1e-8) _pole.set(1, 0, 0);
  }
  _pole.normalize();

  const cosHip = THREE.MathUtils.clamp(
    (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist),
    -1,
    1,
  );
  const sinHip = Math.sqrt(Math.max(0, 1 - cosHip * cosHip));
  _kneeT.copy(hip).addScaledVector(_dir, cosHip * len1).addScaledVector(_pole, sinHip * len1);
  aimBoneAt(upper, lower, _kneeT);
  aimBoneAt(lower, foot, target);
}

function restoreFoot(inner: THREE.Object3D, leg: LegPlant): void {
  inner.getWorldQuaternion(_iq);
  _delta.copy(_iq).multiply(leg.footInInner);
  const parent = leg.foot.parent;
  if (parent) {
    parent.updateMatrixWorld(true);
    parent.getWorldQuaternion(_pw);
    leg.foot.quaternion.copy(_pw).invert().multiply(_delta);
  }
  if (leg.toes && leg.toesLocal) leg.toes.quaternion.copy(leg.toesLocal);
}



/** Cos-space floor along side-outward. Below = thigh adducted into the body. */
export const THIGH_MIN_OUTWARD = 0.06;
/**
 * Ceiling for the measured floor. ~9.2° out from vertical still reads as a
 * natural stance, so the clamp never asks for more than that.
 */
export const THIGH_MAX_OUTWARD = 0.16;
/** Thigh length the base floor was tuned against (metres). */
export const THIGH_REF_LEN = 0.36;
/** Only unblend when the thigh roughly hangs (dir.y below this). */
export const THIGH_GATE_Y = -0.2;

/**
 * Outward floor for one rig, from its own thigh length.
 *
 * THIGH_MIN_OUTWARD is a DIRECTION COSINE, so the notch it buys is an ANGLE
 * times the thigh length. One constant therefore means a different stance on
 * every cast: 0.06 opens ~21 mm on the 0.353 m thigh it was tuned against, but
 * only ~8 mm on char 27's 0.134 m thigh (still reads as fused) and ~32 mm on
 * char 3's 0.527 m thigh (already open enough, so nothing is gained there).
 * That mismatch is why the correction looked right on average-height cast and
 * thin on the short-legged ones.
 *
 * Scale by length so every rig gets a comparable ABSOLUTE notch. Only an
 * under-provisioned rig is raised: for a thigh at or above THIGH_REF_LEN the
 * floor stays exactly the tuned base, so cast that already reads correctly is
 * untouched, and THIGH_MAX_OUTWARD bounds the ask on chibi rigs.
 */
export function thighFloorFor(thighLen: number): number {
  if (!Number.isFinite(thighLen) || thighLen <= 1e-4) return THIGH_MIN_OUTWARD;
  const scaled = THIGH_MIN_OUTWARD * (THIGH_REF_LEN / thighLen);
  if (scaled <= THIGH_MIN_OUTWARD) return THIGH_MIN_OUTWARD;
  return scaled >= THIGH_MAX_OUTWARD ? THIGH_MAX_OUTWARD : scaled;
}

const _thA = new THREE.Vector3();
const _thB = new THREE.Vector3();
const _thD = new THREE.Vector3();
const _thLP = new THREE.Vector3();
const _thRP = new THREE.Vector3();
const _thOut = new THREE.Vector3();
const _thFix = new THREE.Vector3();
const _thQF = new THREE.Quaternion();
const _thQP = new THREE.Quaternion();
const _thQW = new THREE.Quaternion();

/**
 * Side-outward component of a thigh direction.
 * hipLine = leftUpper -> rightUpper; sideOut points away from the midline.
 */
export function thighOutwardComponent(
  thighDir: THREE.Vector3,
  leftUpperPos: THREE.Vector3,
  rightUpperPos: THREE.Vector3,
  left: boolean,
): number {
  _thOut.subVectors(rightUpperPos, leftUpperPos);
  if (_thOut.lengthSq() < 1e-10) return 0;
  _thOut.normalize();
  if (left) _thOut.negate();
  return thighDir.dot(_thOut);
}

/**
 * Floor a hanging upper-leg's outward swing so the thigh cannot fold into
 * the pelvis/torso (Mon: blended legs and body). Raised/folded legs
 * (dir.y >= THIGH_GATE_Y) keep full freedom. Mirror of shoulder adduction
 * clamp, but side-aware so left and right both open away from midline.
 *
 * `minOutward` is the outward floor; pass thighFloorFor(thighLen) so the
 * notch scales with the rig instead of shrinking on short legs.
 */
export function clampThighAdduction(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  leftUpper: THREE.Object3D,
  rightUpper: THREE.Object3D,
  left: boolean,
  minOutward: number = THIGH_MIN_OUTWARD,
): boolean {
  const a = upper.getWorldPosition(_thA);
  const b = lower.getWorldPosition(_thB);
  const d = _thD.subVectors(b, a);
  if (d.lengthSq() < 1e-10) return false;
  d.normalize();
  if (d.y >= THIGH_GATE_Y) return false;
  const lp = leftUpper.getWorldPosition(_thLP);
  const rp = rightUpper.getWorldPosition(_thRP);
  const outD = thighOutwardComponent(d, lp, rp, left);
  if (outD >= minOutward) return false;
  _thOut.subVectors(rp, lp);
  if (_thOut.lengthSq() < 1e-10) return false;
  _thOut.normalize();
  if (left) _thOut.negate();
  const dFix = _thFix.copy(d).addScaledVector(_thOut, minOutward - outD).normalize();
  _thQF.setFromUnitVectors(d, dFix);
  if (!upper.parent) return false;
  const parentW = upper.parent.getWorldQuaternion(_thQP);
  const world = upper.getWorldQuaternion(_thQW);
  // W' = qFix * W  =>  local = parentW^-1 * qFix * W
  upper.quaternion.copy(parentW.invert()).multiply(_thQF).multiply(world);
  return true;
}

/** Unblend both thighs when hanging into the body. Returns sides fixed. */
export function applyThighUnblend(
  getBone: (name: string) => THREE.Object3D | null,
): number {
  const lu = getBone('leftUpperLeg');
  const ru = getBone('rightUpperLeg');
  const ll = getBone('leftLowerLeg');
  const rl = getBone('rightLowerLeg');
  if (!lu || !ru || !ll || !rl) return 0;
  // Scale the floor by this rig's own thigh length (see thighFloorFor).
  const floor = thighFloorFor(lu.getWorldPosition(_thA).distanceTo(ll.getWorldPosition(_thB)));
  let n = 0;
  if (clampThighAdduction(lu, ll, lu, ru, true, floor)) n += 1;
  if (clampThighAdduction(ru, rl, lu, ru, false, floor)) n += 1;
  return n;
}

export class FootPlanter {
  private inner: THREE.Object3D | null = null;
  private hips: THREE.Object3D | null = null;
  private hipsPos = new THREE.Vector3();
  private hipsQuat = new THREE.Quaternion();
  private left: LegPlant | null = null;
  private right: LegPlant | null = null;
  ready = false;

  capture(inner: THREE.Object3D, getBone: (name: string) => THREE.Object3D | null): void {
    this.inner = inner;
    const hips = getBone('hips');
    if (!hips) {
      this.ready = false;
      return;
    }
    inner.updateMatrixWorld(true);
    this.hips = hips;
    this.hipsPos.copy(hips.position);
    this.hipsQuat.copy(hips.quaternion);
    this.left = this.captureLeg(inner, getBone, 'left');
    this.right = this.captureLeg(inner, getBone, 'right');
    if (this.left && this.right) {
      const y = sharedGroundY(this.left.ankleLocal.y, this.right.ankleLocal.y);
      this.left.ankleLocal.y = y;
      this.right.ankleLocal.y = y;
    }
    this.ready = true;
  }

  private captureLeg(
    inner: THREE.Object3D,
    getBone: (name: string) => THREE.Object3D | null,
    side: 'left' | 'right',
  ): LegPlant | null {
    const upper = getBone(`${side}UpperLeg`);
    const lower = getBone(`${side}LowerLeg`);
    const foot = getBone(`${side}Foot`);
    if (!upper || !lower || !foot) return null;
    const toes = getBone(`${side}Toes`);
    inner.getWorldQuaternion(_iq);
    foot.getWorldQuaternion(_delta);
    const ankleLocal = foot.getWorldPosition(_vA).clone();
    inner.worldToLocal(ankleLocal);
    return {
      upper,
      lower,
      foot,
      toes,
      upperPos: upper.position.clone(),
      lowerPos: lower.position.clone(),
      footPos: foot.position.clone(),
      ankleLocal,
      footInInner: _iq.clone().invert().multiply(_delta),
      toesLocal: toes ? toes.quaternion.clone() : null,
    };
  }

  /**
   * Put both ankles on the shared ground contact. A punch lean may pitch
   * and slide the hips; the soles stay on the captured point. No-op when
   * not captured.
   */
  apply(lean?: PlantLean): void {
    if (!this.ready || !this.inner || !this.hips) return;
    const inner = this.inner;
    const hips = this.hips;
    hips.position.copy(this.hipsPos);
    hips.quaternion.copy(this.hipsQuat);
    if (lean && (lean.shiftX || lean.shiftZ)) {
      hips.updateMatrixWorld(true);
      hips.getWorldPosition(_hipW);
      _hipW.x += lean.shiftX;
      _hipW.z += lean.shiftZ;
      if (hips.parent) {
        hips.parent.worldToLocal(_hipW);
        hips.position.copy(_hipW);
      }
    }
    if (lean && (lean.pitch || lean.roll)) {
      _leanE.set(lean.pitch, 0, lean.roll);
      _q.setFromEuler(_leanE);
      hips.quaternion.multiply(_q);
    }
    const legs = [this.left, this.right];
    for (const leg of legs) {
      if (!leg) continue;
      leg.upper.position.copy(leg.upperPos);
      leg.lower.position.copy(leg.lowerPos);
      leg.foot.position.copy(leg.footPos);
    }
    inner.updateMatrixWorld(true);
    inner.getWorldQuaternion(_iq);
    _fwd.set(0, 0, 1).applyQuaternion(_iq);
    const targetL = this.left ? inner.localToWorld(_targetL.copy(this.left.ankleLocal)) : null;
    const targetR = this.right ? inner.localToWorld(_targetR.copy(this.right.ankleLocal)) : null;
    if (targetL && targetR) {
      const y = sharedGroundY(targetL.y, targetR.y);
      targetL.y = y;
      targetR.y = y;
    }
    const solve = () => {
      if (this.left && targetL) solveLeg(this.left.upper, this.left.lower, this.left.foot, targetL, _fwd);
      if (this.right && targetR) solveLeg(this.right.upper, this.right.lower, this.right.foot, targetR, _fwd);
    };
    solve();
    // If a straight leg still cannot reach the shared floor, drop the hips
    // (world up only) and solve again so the other foot bends instead of hovering.
    let excess = 0;
    const measure = (leg: LegPlant | null, target: THREE.Vector3 | null) => {
      if (!leg || !target) return;
      const hip = leg.upper.getWorldPosition(_hipW);
      const knee = leg.lower.getWorldPosition(_vB);
      const ankle = leg.foot.getWorldPosition(_vC);
      const horiz = Math.hypot(target.x - hip.x, target.z - hip.z);
      const reach = hip.distanceTo(knee) + knee.distanceTo(ankle);
      if (horiz < reach - 1e-3 && ankle.y > target.y + 0.003) {
        excess = Math.max(excess, ankle.y - target.y);
      }
    };
    measure(this.left, targetL);
    measure(this.right, targetR);
    if (excess > 0) {
      hips.getWorldPosition(_hipW);
      _hipW.y -= Math.min(excess, 0.25);
      hips.parent?.worldToLocal(_hipW);
      hips.position.copy(_hipW);
      hips.updateMatrixWorld(true);
      solve();
    }
    if (this.left) restoreFoot(inner, this.left);
    if (this.right) restoreFoot(inner, this.right);
  }
}
