import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  THIGH_GATE_Y,
  THIGH_MIN_OUTWARD,
  applyThighUnblend,
  clampThighAdduction,
  thighOutwardComponent,
} from '../lib/vrm/plant-feet';
import { applyCastFix, captureCastFix } from '../lib/vrm/cast-pose';

function makeThigh(side: 'left' | 'right', hips: THREE.Object3D, dir: THREE.Vector3): {
  upper: THREE.Object3D;
  lower: THREE.Object3D;
} {
  const sign = side === 'left' ? 1 : -1;
  const upper = new THREE.Object3D();
  upper.name = `${side}UpperLeg`;
  upper.position.set(0.1 * sign, 0, 0);
  const lower = new THREE.Object3D();
  lower.name = `${side}LowerLeg`;
  // Place lower along dir from upper in local space (parent=hips world ~ identity)
  lower.position.copy(dir).multiplyScalar(0.45);
  upper.add(lower);
  hips.add(upper);
  return { upper, lower };
}

describe('thighOutwardComponent', () => {
  it('is positive when a left thigh points left of midline', () => {
    const left = new THREE.Vector3(0.12, 0, 0);
    const right = new THREE.Vector3(-0.12, 0, 0);
    // Character +X = left. Left thigh going further left (+X) and down.
    const dir = new THREE.Vector3(0.4, -0.9, 0).normalize();
    expect(thighOutwardComponent(dir, left, right, true)).toBeGreaterThan(0.2);
  });

  it('is negative when a left thigh folds into the body', () => {
    const left = new THREE.Vector3(0.12, 0, 0);
    const right = new THREE.Vector3(-0.12, 0, 0);
    // Pointing toward midline / right side
    const dir = new THREE.Vector3(-0.5, -0.85, 0).normalize();
    expect(thighOutwardComponent(dir, left, right, true)).toBeLessThan(0);
  });
});

describe('clampThighAdduction', () => {
  it('opens an adducted hanging thigh off the body and leaves a clear hang alone', () => {
    const root = new THREE.Group();
    const hips = new THREE.Object3D();
    hips.name = 'hips';
    root.add(hips);
    // Left thigh collapsed into body (-X toward right)
    const bad = makeThigh('left', hips, new THREE.Vector3(-0.55, -0.84, 0));
    const good = makeThigh('right', hips, new THREE.Vector3(-0.25, -0.97, 0));
    root.updateMatrixWorld(true);

    const before = new THREE.Vector3();
    bad.lower.getWorldPosition(before).sub(bad.upper.getWorldPosition(new THREE.Vector3())).normalize();
    expect(thighOutwardComponent(before, bad.upper.getWorldPosition(new THREE.Vector3()), good.upper.getWorldPosition(new THREE.Vector3()), true)).toBeLessThan(THIGH_MIN_OUTWARD);

    expect(clampThighAdduction(bad.upper, bad.lower, bad.upper, good.upper, true)).toBe(true);
    root.updateMatrixWorld(true);
    const after = new THREE.Vector3();
    bad.lower.getWorldPosition(after).sub(bad.upper.getWorldPosition(new THREE.Vector3())).normalize();
    expect(after.y).toBeLessThan(THIGH_GATE_Y);
    expect(thighOutwardComponent(after, bad.upper.getWorldPosition(new THREE.Vector3()), good.upper.getWorldPosition(new THREE.Vector3()), true)).toBeGreaterThanOrEqual(THIGH_MIN_OUTWARD - 1e-4);

    // Right thigh already open enough — no change
    expect(clampThighAdduction(good.upper, good.lower, bad.upper, good.upper, false)).toBe(false);
  });

  it('skips raised thighs', () => {
    const root = new THREE.Group();
    const hips = new THREE.Object3D();
    root.add(hips);
    const raised = makeThigh('left', hips, new THREE.Vector3(0.1, 0.5, 0.8));
    const other = makeThigh('right', hips, new THREE.Vector3(-0.2, -0.98, 0));
    root.updateMatrixWorld(true);
    expect(clampThighAdduction(raised.upper, raised.lower, raised.upper, other.upper, true)).toBe(false);
  });
});

describe('applyThighUnblend', () => {
  it('fixes both adducted sides via getBone', () => {
    const root = new THREE.Group();
    const hips = new THREE.Object3D();
    root.add(hips);
    const L = makeThigh('left', hips, new THREE.Vector3(-0.5, -0.86, 0));
    const R = makeThigh('right', hips, new THREE.Vector3(0.5, -0.86, 0));
    root.updateMatrixWorld(true);
    const bones: Record<string, THREE.Object3D> = {
      leftUpperLeg: L.upper,
      leftLowerLeg: L.lower,
      rightUpperLeg: R.upper,
      rightLowerLeg: R.lower,
    };
    expect(applyThighUnblend((n) => bones[n] ?? null)).toBe(2);
  });
});

describe('cast hips level for distorted cast', () => {
  it('levels hips yaw/roll with spine for UPPER_BODY ids (keep pitch)', () => {
    const bones = new Map<string, THREE.Object3D>();
    for (const name of ['hips', 'spine', 'chest', 'upperChest'] as const) {
      const b = new THREE.Object3D();
      b.quaternion.setFromEuler(new THREE.Euler(0.12, 0.4, -0.35, 'YXZ'));
      bones.set(name, b);
    }
    const state = captureCastFix('a10-agahomei-normal', (name) => bones.get(name) ?? null);
    expect(state?.levels.map((e) => e.bone)).toHaveLength(3);
    expect(state?.levels.some((e) => e.bone === bones.get('hips'))).toBe(false);
    applyCastFix(state!);
    const hipsE = new THREE.Euler().setFromQuaternion(bones.get('hips')!.quaternion, 'YXZ');
    expect(hipsE.x).toBeCloseTo(0.12, 5);
    expect(hipsE.y).toBeCloseTo(0.4, 5);
    expect(hipsE.z).toBeCloseTo(-0.35, 5);
    for (const name of ['spine', 'chest', 'upperChest'] as const) {
      const e = new THREE.Euler().setFromQuaternion(bones.get(name)!.quaternion, 'YXZ');
      expect(e.x).toBeCloseTo(0.12, 5);
      expect(Math.abs(e.y)).toBeLessThan(1e-4);
      expect(Math.abs(e.z)).toBeLessThan(1e-4);
    }
  });

  it('levels hips (upper mode) for FULL_UPRIGHT char 33', () => {
    const bones = new Map<string, THREE.Object3D>();
    for (const name of ['hips', 'spine', 'chest', 'upperChest'] as const) {
      const b = new THREE.Object3D();
      b.quaternion.setFromEuler(new THREE.Euler(0.2, 0.3, 0.25, 'YXZ'));
      bones.set(name, b);
    }
    const state = captureCastFix('a103-rockredgradientjk', (name) => bones.get(name) ?? null);
    expect(state?.levels.some((e) => e.bone === bones.get('hips') && e.mode === 'upper')).toBe(true);
    applyCastFix(state!);
    const hipsE = new THREE.Euler().setFromQuaternion(bones.get('hips')!.quaternion, 'YXZ');
    expect(hipsE.x).toBeCloseTo(0.2, 5);
    expect(Math.abs(hipsE.y)).toBeLessThan(1e-4);
    const spineE = new THREE.Euler().setFromQuaternion(bones.get('spine')!.quaternion, 'YXZ');
    expect(Math.abs(spineE.x)).toBeLessThan(1e-4);
  });
});
