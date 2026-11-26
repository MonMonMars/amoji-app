import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clampUpperArmAdduction, IDLE_ARM_ABDUCT } from '../lib/vrm/avatar';

/**
 * r2026-11-24.310 — the left upper arm folded into the torso while the right
 * one hung correctly. Both sides now floor their OUTWARD swing against their
 * own outward axis: +X for the left arm, −X for the right arm (character-left
 * is +X per docs in lib/poke-hit.ts: facing +Z, character-right is −X).
 *
 * Regression: the clamp used right−left (outward for the RIGHT arm only) on
 * both sides, so the left arm's outward component read negative and it was
 * never opened — the left hand stayed buried in the body.
 */

type Chain = {
  root: THREE.Group;
  leftShoulder: THREE.Object3D;
  rightShoulder: THREE.Object3D;
  upper: THREE.Object3D;
  lower: THREE.Object3D;
};

function buildArm(side: 'left' | 'right', elbowDir: THREE.Vector3): Chain {
  const root = new THREE.Group();
  const leftShoulder = new THREE.Object3D();
  leftShoulder.position.set(0.0434, 1.4, 0);
  const rightShoulder = new THREE.Object3D();
  rightShoulder.position.set(-0.0434, 1.4, 0);
  const upper = new THREE.Object3D();
  upper.position.set(side === 'left' ? 0.0434 : -0.0434, 1.4, 0);
  const lower = new THREE.Object3D();
  // child of the upper arm so bone→child reads the hang direction
  lower.position.copy(elbowDir).normalize().multiplyScalar(0.25);
  upper.add(lower);
  root.add(leftShoulder, rightShoulder, upper);
  root.updateMatrixWorld(true);
  return { root, leftShoulder, rightShoulder, upper, lower };
}

function armDir(chain: Chain): THREE.Vector3 {
  chain.root.updateMatrixWorld(true);
  const a = chain.upper.getWorldPosition(new THREE.Vector3());
  const b = chain.lower.getWorldPosition(new THREE.Vector3());
  return b.sub(a).normalize();
}

const DOWN_INWARD = new THREE.Vector3(-0.389, -0.921, 0.12); // left arm across body
const DOWN_OUTWARD = new THREE.Vector3(0.389, -0.921, 0.12);

describe('upper-arm outward clamp is side-aware', () => {
  it('opens a LEFT arm that hangs across the body', () => {
    // left arm aimed at −X = character-right = INWARD
    const chain = buildArm('left', DOWN_INWARD);
    expect(armDir(chain).x).toBeLessThan(-0.3);
    clampUpperArmAdduction(
      chain.upper, chain.lower, chain.leftShoulder, chain.rightShoulder, 'left',
    );
    // outward for the left arm is +X, so the −X component is floored
    expect(armDir(chain).x).toBeGreaterThan(-0.2);
  });

  it('leaves a LEFT arm hanging outward alone', () => {
    const chain = buildArm('left', DOWN_OUTWARD);
    const before = armDir(chain).clone();
    clampUpperArmAdduction(
      chain.upper, chain.lower, chain.leftShoulder, chain.rightShoulder, 'left',
    );
    const after = armDir(chain);
    expect(after.dot(before)).toBeGreaterThan(0.9999);
  });

  it('still clamps a RIGHT arm that hangs across the body', () => {
    const chain = buildArm('right', DOWN_OUTWARD); // right arm at +X = INWARD
    expect(armDir(chain).x).toBeGreaterThan(0.3);
    clampUpperArmAdduction(
      chain.upper, chain.lower, chain.leftShoulder, chain.rightShoulder, 'right',
    );
    expect(armDir(chain).x).toBeLessThan(0.2);
  });

  it('leaves a RIGHT arm hanging outward alone', () => {
    const chain = buildArm('right', DOWN_INWARD); // right arm at −X = OUTWARD
    const before = armDir(chain).clone();
    clampUpperArmAdduction(
      chain.upper, chain.lower, chain.leftShoulder, chain.rightShoulder, 'right',
    );
    expect(armDir(chain).dot(before)).toBeGreaterThan(0.9999);
  });

  it('does not touch arms raised above the shoulder', () => {
    const chain = buildArm('left', new THREE.Vector3(-0.9, 0.3, 0));
    const before = armDir(chain).clone();
    clampUpperArmAdduction(
      chain.upper, chain.lower, chain.leftShoulder, chain.rightShoulder, 'left',
    );
    expect(armDir(chain).dot(before)).toBeGreaterThan(0.9999);
  });

  it('keeps the natural idle hang wider than plumb on both sides', () => {
    // IDLE_ARM_ABDUCT is the angle the eased hang opens to; a plumb (0)
    // hang is what buried the hands, so the constant must stay positive.
    expect(IDLE_ARM_ABDUCT).toBeGreaterThan(0.15);
  });
});
