// Post-mixer euler nudges while a standing idle VRMA drives the body (not performances).
// Default pass: slight hang/sway on arms; elbow floor when the chain reads straight.

import * as THREE from 'three';

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

/** Extra scale for clip-specific rules on military / T-pose leaning idles. */
export const IDLE_STIFF_CLIP_GAIN = 1.55;

const STIFF_IDLE_CLIPS = new Set<string>([
  'IdleMixamoExcited',
  'IdleMixamoStanding',
  'IdleRpmMArmStanding001',
  'IdleRpmMStanding001',
  'IdleRpmFStanding001',
  'IdleRpmMStanding002',
]);

/** Applied to every idle after the mixer; subtle gravity hang + elbow hint. */
const DEFAULT_IDLE_RULES: SoftRule[] = [
  { bone: 'leftUpperArm', x: 0.025, z: 0.05 },
  { bone: 'rightUpperArm', x: 0.025, z: -0.05 },
  { bone: 'leftLowerArm', x: 0.11 },
  { bone: 'rightLowerArm', x: 0.11 },
  { bone: 'leftHand', x: 0.035, z: 0.02 },
  { bone: 'rightHand', x: 0.035, z: -0.02 },
];

const CLIP_RULES: Record<string, SoftRule[]> = {
  IdleBreathCalm: [
    { bone: 'spine', x: 0.04 },
    { bone: 'leftUpperArm', z: 0.04 },
    { bone: 'rightUpperArm', z: -0.04 },
    { bone: 'leftLowerArm', x: 0.05 },
    { bone: 'rightLowerArm', x: 0.05 },
  ],
  StandardIdle: [
    { bone: 'spine', x: 0.05 },
    { bone: 'neck', x: 0.03 },
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
    { bone: 'leftUpperArm', x: 0.04, z: 0.08 },
    { bone: 'rightUpperArm', x: 0.04, z: -0.08 },
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

export function idleStiffClipGain(clipId: string | null | undefined): number {
  if (!clipId) return 1;
  return STIFF_IDLE_CLIPS.has(clipId) ? IDLE_STIFF_CLIP_GAIN : 1;
}

export function applyIdleClipSoftening(getBone: GetBone, clipId: string | null | undefined): void {
  if (!clipId) return;
  const gain = idleStiffClipGain(clipId);
  applyRuleList(getBone, DEFAULT_IDLE_RULES, gain);
  const extra = CLIP_RULES[clipId];
  if (extra) applyRuleList(getBone, extra, gain);
  const floor = IDLE_ELBOW_FLOOR_X * gain;
  if (armHanging(getBone, 'left')) enforceIdleElbowFloor(getBone, 'left', floor);
  if (armHanging(getBone, 'right')) enforceIdleElbowFloor(getBone, 'right', floor);
}
