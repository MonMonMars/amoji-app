import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { liftedClavicleLocal } from '../lib/vrm/cast-pose';

function makeShoulderPair(side: 'left' | 'right') {
  const root = new THREE.Object3D();
  const shoulder = new THREE.Object3D();
  shoulder.name = side === 'left' ? 'leftShoulder' : 'rightShoulder';
  // Left shoulder at -X, right at +X; upper arm hangs slightly down and out.
  const sx = side === 'left' ? -0.12 : 0.12;
  const ux = side === 'left' ? -0.28 : 0.28;
  shoulder.position.set(sx, 1.4, 0);
  const upper = new THREE.Object3D();
  upper.position.set(ux, 1.15, 0);
  root.add(shoulder);
  shoulder.add(upper);
  root.updateMatrixWorld(true);
  return { shoulder, upper };
}

describe('liftedClavicleLocal', () => {
  it('returns independent quats for left and right (no scratch alias)', () => {
    const L = makeShoulderPair('left');
    const R = makeShoulderPair('right');
    const qL = liftedClavicleLocal(L.shoulder, L.upper);
    const qR = liftedClavicleLocal(R.shoulder, R.upper);
    expect(qL).not.toBe(qR);
    // Mutating one must not change the other (alias bug).
    const before = qR.clone();
    qL.set(0, 0, 0, 1);
    expect(qR.x).toBeCloseTo(before.x, 6);
    expect(qR.y).toBeCloseTo(before.y, 6);
    expect(qR.z).toBeCloseTo(before.z, 6);
    expect(qR.w).toBeCloseTo(before.w, 6);
  });
});
