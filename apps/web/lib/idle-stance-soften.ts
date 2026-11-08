// Post-mixer euler nudges per pinned idle (Pixel review 2026-11-08). Subtle only.

import * as THREE from 'three';

type GetBone = (name: string) => THREE.Object3D | null;

const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _q = new THREE.Quaternion();

interface SoftRule {
  bone: string;
  x?: number;
  y?: number;
  z?: number;
}

const RULES: Record<string, SoftRule[]> = {
  IdleBreathCalm: [
    { bone: 'spine', x: 0.04 },
    { bone: 'leftUpperArm', z: 0.05 },
    { bone: 'rightUpperArm', z: -0.05 },
  ],
  StandardIdle: [
    { bone: 'spine', x: 0.05 },
    { bone: 'neck', x: 0.03 },
    { bone: 'leftUpperArm', z: 0.06 },
    { bone: 'rightUpperArm', z: -0.06 },
  ],
  Clapping: [
    { bone: 'leftHand', z: 0.12 },
    { bone: 'rightHand', z: -0.12 },
  ],
  IdleMixamoExcited: [
    { bone: 'leftLowerArm', x: -0.08 },
    { bone: 'rightLowerArm', x: -0.08 },
  ],
};

export function applyIdleClipSoftening(getBone: GetBone, clipId: string | null | undefined): void {
  if (!clipId) return;
  const rules = RULES[clipId];
  if (!rules) return;
  for (const r of rules) {
    const b = getBone(r.bone);
    if (!b) continue;
    _e.set(r.x ?? 0, r.y ?? 0, r.z ?? 0);
    _q.setFromEuler(_e);
    b.quaternion.multiply(_q);
  }
}
