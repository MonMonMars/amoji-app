import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  IDLE_ELBOW_FLOOR_X,
  IDLE_STIFF_CLIP_GAIN,
  IDLE_CALM_TORSO_PITCH_MAX,
  IDLE_TORSO_PITCH_MAX,
  applyIdleClipSoftening,
  idleArmRewriteAllowed,
  idleStiffClipGain,
  pullIdleTorsoUpright,
} from '../lib/idle-stance-soften';

describe('idle stance soften', () => {
  it('boosts stiff standing clips', () => {
    expect(idleStiffClipGain('IdleBreathCalm')).toBe(1);
    expect(idleStiffClipGain('IdleMixamoExcited')).toBe(IDLE_STIFF_CLIP_GAIN);
    expect(idleStiffClipGain('IdleRpmMArmStanding001')).toBe(IDLE_STIFF_CLIP_GAIN);
  });

  it('skips arm rewrite on Quaternius / RPM calm stands (no frankenstein)', () => {
    expect(idleArmRewriteAllowed('IdleQuaterniusHuman')).toBe(false);
    expect(idleArmRewriteAllowed('IdleRpmFStanding001')).toBe(false);
    expect(IDLE_TORSO_PITCH_MAX).toBeLessThanOrEqual(0.035);
    expect(IDLE_CALM_TORSO_PITCH_MAX).toBeGreaterThan(IDLE_TORSO_PITCH_MAX);
    expect(IDLE_CALM_TORSO_PITCH_MAX).toBeLessThanOrEqual(0.14);
  });

  it('leaves calm stand bones untouched (no torso smear on damped VRMA)', () => {
    const spine = new THREE.Bone();
    spine.name = 'spine';
    spine.quaternion.setFromEuler(new THREE.Euler(0.08, 0, 0, 'YXZ'));
    const before = spine.quaternion.clone();
    applyIdleClipSoftening((n) => (n === 'spine' ? spine : null), 'IdleQuaterniusHuman');
    expect(spine.quaternion.dot(before)).toBeGreaterThan(0.9999);
    applyIdleClipSoftening((n) => (n === 'spine' ? spine : null), 'IdleRpmFStanding001');
    expect(spine.quaternion.dot(before)).toBeGreaterThan(0.9999);
  });

  it('pulls torso pitch back from a forward lean (no weird lean-forward)', () => {
    const spine = new THREE.Bone();
    spine.name = 'spine';
    spine.quaternion.setFromEuler(new THREE.Euler(0.35, 0, 0, 'YXZ'));
    pullIdleTorsoUpright((n) => (n === 'spine' ? spine : null));
    const e = new THREE.Euler().setFromQuaternion(spine.quaternion, 'YXZ');
    expect(e.x).toBeLessThanOrEqual(IDLE_TORSO_PITCH_MAX + 1e-5);
    expect(e.x).toBeGreaterThanOrEqual(-IDLE_TORSO_PITCH_MAX - 1e-5);
  });

  it('never adds spine/neck forward-lean rules on calm idles', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.join(import.meta.dirname, '../lib/idle-stance-soften.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/IdleBreathCalm:[\s\S]*?\{ bone: 'spine', x:/);
    expect(src).not.toMatch(/StandardIdle:[\s\S]*?\{ bone: 'spine', x:/);
    expect(src).not.toMatch(/\{ bone: 'neck', x: 0\.0[3-9]/);
    expect(src).toContain('pullIdleTorsoUpright');
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
    expect(lower.quaternion.dot(before)).toBeGreaterThan(0.99);
  });
});
