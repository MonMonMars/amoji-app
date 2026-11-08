import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  IDLE_ELBOW_FLOOR_X,
  IDLE_STIFF_CLIP_GAIN,
  applyIdleClipSoftening,
  idleStiffClipGain,
} from '../lib/idle-stance-soften';

describe('idle stance soften', () => {
  it('boosts stiff standing clips', () => {
    expect(idleStiffClipGain('IdleBreathCalm')).toBe(1);
    expect(idleStiffClipGain('IdleMixamoExcited')).toBe(IDLE_STIFF_CLIP_GAIN);
    expect(idleStiffClipGain('IdleRpmMArmStanding001')).toBe(IDLE_STIFF_CLIP_GAIN);
  });

  it('raises elbow flex floor on a straight hanging forearm', () => {
    const hips = new THREE.Bone();
    hips.name = 'hips';
    const upper = new THREE.Bone();
    upper.name = 'leftUpperArm';
    upper.position.set(0.2, 0, 0);
    const lower = new THREE.Bone();
    lower.name = 'leftLowerArm';
    lower.position.set(0, -0.28, 0);
    hips.add(upper);
    upper.add(lower);
    lower.quaternion.setFromEuler(new THREE.Euler(0.02, 0, 0, 'YXZ'));
    hips.updateMatrixWorld(true);

    const bones = new Map<string, THREE.Bone>([
      ['hips', hips],
      ['leftUpperArm', upper],
      ['leftLowerArm', lower],
    ]);
    const getBone = (n: string) => bones.get(n) ?? null;

    applyIdleClipSoftening(getBone, 'IdleBreathCalm');
    const e = new THREE.Euler().setFromQuaternion(lower.quaternion, 'YXZ');
    expect(e.x).toBeGreaterThanOrEqual(IDLE_ELBOW_FLOOR_X - 1e-5);
  });

  it('does not apply elbow floor when the arm is raised', () => {
    const hips = new THREE.Bone();
    const upper = new THREE.Bone();
    upper.name = 'leftUpperArm';
    const lower = new THREE.Bone();
    lower.name = 'leftLowerArm';
    lower.position.set(0, 0.28, 0);
    hips.add(upper);
    upper.add(lower);
    lower.quaternion.setFromEuler(new THREE.Euler(0.02, 0, 0, 'YXZ'));
    hips.updateMatrixWorld(true);
    const before = lower.quaternion.clone();

    applyIdleClipSoftening(
      (n) => (n === 'leftUpperArm' ? upper : n === 'leftLowerArm' ? lower : null),
      'StandardIdle',
    );
    expect(lower.quaternion.dot(before)).toBeGreaterThan(0.999);
  });
});
