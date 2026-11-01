// Per-character rest corrections on top of the shared rig.
// Head: drop neck/head yaw and roll, keep pitch and later look-around.
// Upper body: drop spine/chest twist and side-bend. Hips and feet stay.
// Shoulders: a raised clavicle while the arm hangs, only for sunk-shoulder ids.
// The correction is a constant quaternion applied after the mixer so a clip
// can still animate on top of a level rest.

import * as THREE from 'three';
import {
  needsFullUpright,
  needsHeadLevel,
  needsShoulderLift,
  needsUpperBodyLevel,
} from '../cast-adjust';

const _e = new THREE.Euler();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _worldQ = new THREE.Quaternion();
const _liftQ = new THREE.Quaternion();

export type LevelMode = 'head' | 'upper' | 'upright';

/** Level a local bone quaternion. Pitch survives head and upper modes. */
export function levelQuaternion(local: THREE.Quaternion, mode: LevelMode): THREE.Quaternion {
  _e.setFromQuaternion(local, 'YXZ');
  _e.z = 0;
  if (mode === 'head' || mode === 'upper' || mode === 'upright') _e.y = 0;
  if (mode === 'upright') _e.x = 0;
  return new THREE.Quaternion().setFromEuler(_e);
}

/** correction * rest = leveled rest. */
export function castCorrection(rest: THREE.Quaternion, mode: LevelMode): THREE.Quaternion {
  const desired = levelQuaternion(rest, mode);
  return desired.multiply(rest.clone().invert());
}

function quatAngle(q: THREE.Quaternion): number {
  const w = Math.min(1, Math.abs(q.w));
  return 2 * Math.acos(w);
}

interface LevelEntry {
  bone: THREE.Object3D;
  mode: LevelMode;
  /** Head: constant bias so a later look-around still plays. Upper body: re-level every frame. */
  correction: THREE.Quaternion | null;
  mixer: THREE.Quaternion;
  written: THREE.Quaternion;
  seen: boolean;
}

interface ShoulderEntry {
  shoulder: THREE.Object3D;
  upper: THREE.Object3D;
  lower: THREE.Object3D | null;
  lifted: THREE.Quaternion;
}

export interface CastFixState {
  levels: LevelEntry[];
  shoulders: ShoulderEntry[];
}

function pushLevel(
  levels: LevelEntry[],
  bone: THREE.Object3D | null,
  mode: LevelMode,
): void {
  if (!bone) return;
  // Upper-body and full-upright runs every frame so a twisted idle clip
  // cannot leave the torso bent. Head keeps a rest bias so look-around yaw
  // still stacks on a level neck.
  if (mode === 'head') {
    const correction = castCorrection(bone.quaternion, mode);
    if (quatAngle(correction) < 0.012) return;
    levels.push({
      bone,
      mode,
      correction,
      mixer: new THREE.Quaternion(),
      written: new THREE.Quaternion(),
      seen: false,
    });
    return;
  }
  levels.push({
    bone,
    mode,
    correction: null,
    mixer: new THREE.Quaternion(),
    written: new THREE.Quaternion(),
    seen: false,
  });
}

/** Clavicle rotation that tips the shoulder→upper-arm direction upward. */
export function liftedClavicleLocal(shoulder: THREE.Object3D, upper: THREE.Object3D): THREE.Quaternion {
  shoulder.updateWorldMatrix(true, false);
  upper.updateWorldMatrix(true, false);
  shoulder.getWorldPosition(_from);
  upper.getWorldPosition(_to);
  _to.sub(_from);
  const len = _to.length();
  if (len < 1e-6) return shoulder.quaternion.clone();
  _from.copy(_to).normalize();
  _to.y += len * 0.32;
  _to.normalize();
  _liftQ.setFromUnitVectors(_from, _to);
  const ang = quatAngle(_liftQ);
  const max = 0.42;
  if (ang > max) {
    _q.identity();
    _q.slerp(_liftQ, max / ang);
    _liftQ.copy(_q);
  }
  shoulder.getWorldQuaternion(_worldQ);
  _liftQ.multiply(_worldQ);
  const parent = shoulder.parent;
  // Clone: callers capture left then right; returning scratch would alias both sides
  // onto the last write (L/R clavicle mismatch / mirrored shoulder lift).
  if (!parent) return _liftQ.clone();
  parent.getWorldQuaternion(_parentQ);
  return _parentQ.clone().invert().multiply(_liftQ);
}

export function captureCastFix(
  characterId: string,
  getBone: (name: string) => THREE.Object3D | null,
): CastFixState | null {
  const levels: LevelEntry[] = [];
  const shoulders: ShoulderEntry[] = [];
  if (needsHeadLevel(characterId)) {
    const mode: LevelMode = 'head';
    pushLevel(levels, getBone('upperChest'), mode);
    pushLevel(levels, getBone('neck'), mode);
    pushLevel(levels, getBone('head'), mode);
  }
  if (needsUpperBodyLevel(characterId)) {
    pushLevel(levels, getBone('spine'), 'upper');
    pushLevel(levels, getBone('chest'), 'upper');
  }
  if (needsFullUpright(characterId)) {
    pushLevel(levels, getBone('spine'), 'upright');
    pushLevel(levels, getBone('chest'), 'upright');
    pushLevel(levels, getBone('upperChest'), 'upright');
  }
  if (needsShoulderLift(characterId)) {
    for (const side of ['left', 'right'] as const) {
      const shoulder = getBone(`${side}Shoulder`);
      const upper = getBone(`${side}UpperArm`);
      if (!shoulder || !upper) continue;
      shoulders.push({
        shoulder,
        upper,
        lower: getBone(`${side}LowerArm`),
        lifted: liftedClavicleLocal(shoulder, upper),
      });
    }
  }
  if (!levels.length && !shoulders.length) return null;
  return { levels, shoulders };
}

function armHanging(upper: THREE.Object3D, lower: THREE.Object3D | null): boolean {
  if (!lower) return true;
  upper.getWorldPosition(_from);
  lower.getWorldPosition(_to);
  _to.sub(_from);
  if (_to.lengthSq() < 1e-8) return false;
  _to.normalize();
  return _to.y < -0.2;
}

export function applyCastFix(state: CastFixState): void {
  for (const entry of state.levels) {
    const q = entry.bone.quaternion;
    if (entry.correction) {
      if (!entry.seen || !q.equals(entry.written)) {
        entry.mixer.copy(q);
        entry.seen = true;
      }
      q.copy(entry.correction).multiply(entry.mixer);
      entry.written.copy(q);
    } else {
      q.copy(levelQuaternion(q, entry.mode));
    }
  }
  for (const entry of state.shoulders) {
    const sticky = entry.shoulder.quaternion.equals(entry.lifted);
    if (!sticky && !armHanging(entry.upper, entry.lower)) continue;
    entry.shoulder.quaternion.copy(entry.lifted);
  }
}
