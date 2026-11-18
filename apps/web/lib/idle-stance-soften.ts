// Post-mixer euler nudges while a standing idle VRMA drives the body (not performances).
// Calm upright stands: torso upright only — arm soften + hang stacked on
// near-still amplitude created Quaternius/RPM frankenstein poses.
// Never push the torso forward — Pixel reported weird lean-forward / blend-to-back.

import * as THREE from 'three';
import {
  isOwnerHonorableBannedAuto,
  isPixelCalmIdleClip,
} from './idle-retired';

type GetBone = (name: string) => THREE.Object3D | null;

const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _q = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();

interface SoftRule {
  bone: string;
  x?: number;
  y?: number;
  z?: number;
}

/** Minimum local YXZ elbow flex (x) when the forearm hangs — avoids locked straight arms. */
export const IDLE_ELBOW_FLOOR_X = 0.14;

/** Extra scale for clip-specific rules on military / T-pose leaning idles.
 *  Kept near 1 — heavy gain + VRMA + hang rewrites ruined even good stands. */
export const IDLE_STIFF_CLIP_GAIN = 1.04;

/**
 * Max |spine/chest X| kept during calm idle. Positive X = lean forward;
 * Pixel: "lean forward weird" came from soften nudges + stiff clip gain.
 */
export const IDLE_TORSO_PITCH_MAX = 0.028;

/**
 * Looser upright cap for calm VRMA (Quaternius / Thinking) — still blocks lean-forward
 * frankenstein but lets spine breathe past the stiff-clip tighten band.
 */
export const IDLE_CALM_TORSO_PITCH_MAX = 0.11;

const STIFF_IDLE_CLIPS = new Set<string>([
  'IdleMixamoExcited',
  'IdleMixamoStanding',
  'IdleRpmMArmStanding001',
  'IdleRpmMStanding002',
]);

/**
 * False for calm upright stands — VRMA + near-still amp own the arms.
 * Soften arm nudges + easeIdleHang on top were the "strange blended pose".
 */
export function idleArmRewriteAllowed(clipId: string | null | undefined): boolean {
  if (!clipId) return false;
  if (isPixelCalmIdleClip(clipId)) return false;
  if (isOwnerHonorableBannedAuto(clipId)) return false;
  if (/Standing|Quaternius|Breathing|Innerscene|Neutral/i.test(clipId)) return false;
  return true;
}

/** Applied only when arm rewrite is allowed; subtle gravity hang + elbow hint. */
const DEFAULT_IDLE_RULES: SoftRule[] = [
  // Arms open slightly — do NOT push upperArm.x forward (reads as body lean).
  { bone: 'leftUpperArm', z: 0.03 },
  { bone: 'rightUpperArm', z: -0.03 },
  { bone: 'leftLowerArm', x: 0.08 },
  { bone: 'rightLowerArm', x: 0.08 },
  { bone: 'leftHand', x: 0.02, z: 0.015 },
  { bone: 'rightHand', x: 0.02, z: -0.015 },
];

const CLIP_RULES: Record<string, SoftRule[]> = {
  IdleBreathCalm: [
    // Was spine.x +0.04 (forward lean). Keep upright; only open arms.
    { bone: 'leftUpperArm', z: 0.04 },
    { bone: 'rightUpperArm', z: -0.04 },
    { bone: 'leftLowerArm', x: 0.05 },
    { bone: 'rightLowerArm', x: 0.05 },
  ],
  StandardIdle: [
    { bone: 'leftUpperArm', z: 0.05 },
    { bone: 'rightUpperArm', z: -0.05 },
    { bone: 'leftLowerArm', x: 0.06 },
    { bone: 'rightLowerArm', x: 0.06 },
  ],
  IdleMixamoExcited: [
    { bone: 'leftUpperArm', z: 0.07 },
    { bone: 'rightUpperArm', z: -0.07 },
    { bone: 'leftLowerArm', x: 0.12 },
    { bone: 'rightLowerArm', x: 0.12 },
  ],
  IdleRpmMArmStanding001: [
    { bone: 'leftUpperArm', z: 0.08 },
    { bone: 'rightUpperArm', z: -0.08 },
    { bone: 'leftLowerArm', x: 0.14 },
    { bone: 'rightLowerArm', x: 0.14 },
  ],
  IdleMixamoStanding: [
    { bone: 'leftLowerArm', x: 0.1 },
    { bone: 'rightLowerArm', x: 0.1 },
  ],
  IdleMixamoArmStretch: [
    // Stretch clip is intentional; only soften wrists so fingers stay human.
    { bone: 'leftHand', x: 0.02 },
    { bone: 'rightHand', x: 0.02 },
  ],
};

function applyEulerNudge(bone: THREE.Object3D, x: number, y: number, z: number): void {
  if (x === 0 && y === 0 && z === 0) return;
  _e.set(x, y, z);
  _q.setFromEuler(_e);
  bone.quaternion.multiply(_q);
}

function applyRuleList(getBone: GetBone, rules: readonly SoftRule[], gain: number): void {
  for (const r of rules) {
    const b = getBone(r.bone);
    if (!b) continue;
    applyEulerNudge(
      b,
      (r.x ?? 0) * gain,
      (r.y ?? 0) * gain,
      (r.z ?? 0) * gain,
    );
  }
}

function armHanging(getBone: GetBone, side: 'left' | 'right'): boolean {
  const upper = getBone(`${side}UpperArm`);
  const lower = getBone(`${side}LowerArm`);
  if (!upper || !lower) return false;
  upper.getWorldPosition(_a);
  lower.getWorldPosition(_b);
  _d.subVectors(_b, _a);
  if (_d.lengthSq() < 1e-8) return false;
  _d.normalize();
  // Forearm mostly below the elbow — idle hang, not a raised perform pose.
  return _d.y < -0.12;
}

function enforceIdleElbowFloor(getBone: GetBone, side: 'left' | 'right', floorX: number): void {
  const lower = getBone(`${side}LowerArm`);
  if (!lower || floorX <= 0) return;
  _e.setFromQuaternion(lower.quaternion, 'YXZ');
  if (_e.x >= floorX) return;
  _e.x = floorX;
  lower.quaternion.setFromEuler(_e);
}

/** Pull torso pitch toward upright so idle never freezes in a forward lean. */
export function pullIdleTorsoUpright(
  getBone: GetBone,
  maxPitch = IDLE_TORSO_PITCH_MAX,
): void {
  for (const name of ['spine', 'chest', 'upperChest', 'neck'] as const) {
    const bone = getBone(name);
    if (!bone) continue;
    _e.setFromQuaternion(bone.quaternion, 'YXZ');
    if (_e.x > maxPitch) _e.x = maxPitch;
    if (_e.x < -maxPitch) _e.x = -maxPitch;
    bone.quaternion.setFromEuler(_e);
  }
}

export function idleStiffClipGain(clipId: string | null | undefined): number {
  if (!clipId) return 1;
  return STIFF_IDLE_CLIPS.has(clipId) ? IDLE_STIFF_CLIP_GAIN : 1;
}

export function applyIdleClipSoftening(getBone: GetBone, clipId: string | null | undefined): void {
  if (!clipId) return;
  // Calm / owner-pinned stands play the damped VRMA as-is — torso pull here
  // fought near-still amp and read as arm/torso smear on phone.
  if (!idleArmRewriteAllowed(clipId)) return;
  // Kill residual forward lean on clips we actually rewrite (stiff / excited).
  pullIdleTorsoUpright(getBone);
  const gain = idleStiffClipGain(clipId);
  applyRuleList(getBone, DEFAULT_IDLE_RULES, gain);
  const extra = CLIP_RULES[clipId];
  if (extra) applyRuleList(getBone, extra, gain);
  // Arm rules can nudge torso — upright again.
  pullIdleTorsoUpright(getBone);
  const floor = IDLE_ELBOW_FLOOR_X * gain;
  if (armHanging(getBone, 'left')) enforceIdleElbowFloor(getBone, 'left', floor);
  if (armHanging(getBone, 'right')) enforceIdleElbowFloor(getBone, 'right', floor);
}
