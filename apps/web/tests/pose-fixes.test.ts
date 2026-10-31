import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { IDLE_ARM_ABDUCT, calibrateRelaxedHands, clavicleRestoreFromArmDir, idleHangDirection } from '../lib/vrm/avatar';
import { capEyeExpression, stabilizeEyeMaterials } from '../lib/vrm/eyes';

describe('eye readability', () => {
  it('caps eyelid morphs and leaves other expressions alone', () => {
    expect(capEyeExpression('blink', 1)).toBeLessThan(0.5);
    expect(capEyeExpression('happy', 1)).toBeLessThan(0.7);
    expect(capEyeExpression('blinkLeft', 0.2)).toBe(0.2);
    expect(capEyeExpression('surprised', 0.9)).toBe(0.9);
    expect(capEyeExpression('aa', 1)).toBe(1);
  });

  it('draws the iris in front of the eye white', () => {
    const white = new THREE.MeshBasicMaterial({ name: 'F00_EyeWhite_00_EYE' });
    const iris = new THREE.MeshBasicMaterial({ name: 'F00_EyeIris_00_EYE', alphaTest: 0.8 });
    const hi = new THREE.MeshBasicMaterial({ name: 'F00_EyeHighlight_00_EYE' });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), white));
    const irisMesh = new THREE.Mesh(new THREE.BoxGeometry(), iris);
    root.add(irisMesh);
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), hi));
    stabilizeEyeMaterials(root);
    expect(iris.polygonOffsetFactor).toBeLessThan(white.polygonOffsetFactor);
    expect(irisMesh.renderOrder).toBeGreaterThan(1);
    expect(iris.alphaTest).toBeLessThanOrEqual(0.4);
    expect(hi.depthWrite).toBe(false);
  });

  it('keeps a dark iris when the pupil texture never arrives', () => {
    const iris = new THREE.MeshBasicMaterial({ name: 'EyeIris', alphaTest: 0.5, color: 0xffffff });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), iris));
    stabilizeEyeMaterials(root);
    expect(iris.alphaTest).toBe(0);
    expect(iris.color.r).toBeLessThan(0.3);
  });
});

describe('idle hang', () => {
  it('opens a straight-down arm and leaves a raised arm alone', () => {
    const outward = new THREE.Vector3(1, 0, 0);
    const down = idleHangDirection(new THREE.Vector3(0, -1, 0), outward, true);
    expect(down).not.toBeNull();
    expect(down!.x).toBeLessThan(0);
    expect(down!.y).toBeCloseTo(-Math.cos(IDLE_ARM_ABDUCT), 5);
    expect(idleHangDirection(new THREE.Vector3(0, 0.2, 1), outward, true)).toBeNull();
    const already = new THREE.Vector3(-Math.sin(IDLE_ARM_ABDUCT), -Math.cos(IDLE_ARM_ABDUCT), 0);
    expect(idleHangDirection(already, outward, false)).toBeNull();
  });
});

describe('relaxed fingers', () => {
  it('curls a straight finger instead of splaying it across the palm', () => {
    const hand = new THREE.Bone();
    hand.name = 'leftHand';
    const make = (name: string, x: number, z: number) => {
      const bone = new THREE.Bone();
      bone.name = name;
      bone.position.set(x, 0, z);
      return bone;
    };
    const fingers = new Map<string, THREE.Object3D>();
    const add = (human: string, parent: THREE.Object3D, x: number, z: number) => {
      const bone = make(human, x, z);
      parent.add(bone);
      fingers.set(human, bone);
      return bone;
    };
    // Fingers run along -X. Index sits at -Z, little at +Z, so sideways is Z.
    const index = add('leftIndexProximal', hand, -0.04, -0.03);
    add('leftIndexIntermediate', index, -0.035, 0);
    const indexD = add('leftIndexDistal', index.children[0]!, -0.028, 0);
    const middle = add('leftMiddleProximal', hand, -0.045, 0);
    add('leftMiddleIntermediate', middle, -0.038, 0);
    add('leftMiddleDistal', middle.children[0]!, -0.03, 0);
    const ring = add('leftRingProximal', hand, -0.04, 0.02);
    add('leftRingIntermediate', ring, -0.034, 0);
    const ringD = add('leftRingDistal', ring.children[0]!, -0.026, 0);
    const little = add('leftLittleProximal', hand, -0.036, 0.04);
    add('leftLittleIntermediate', little, -0.03, 0);
    add('leftLittleDistal', little.children[0]!, -0.024, 0);
    hand.updateMatrixWorld(true);
    const before = ringD.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3()));
    const entries = calibrateRelaxedHands(fingers, new Set());
    for (const e of entries) e.node.quaternion.copy(e.base).multiply(e.delta);
    hand.updateMatrixWorld(true);
    const ringEntry = entries.find((e) => e.node === ring);
    expect(ringEntry).toBeTruthy();
    // Local Z swings -X toward Y (curl). Local Y would splay along Z.
    const axis = new THREE.Vector3(ringEntry!.delta.x, ringEntry!.delta.y, ringEntry!.delta.z);
    expect(Math.abs(axis.z)).toBeGreaterThan(Math.abs(axis.y));
    expect(Math.abs(axis.z)).toBeGreaterThan(Math.abs(axis.x));
    const after = ringD.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3()));
    expect(after).toBeLessThan(before);
    expect(indexD.getWorldPosition(new THREE.Vector3()).z).toBeLessThan(-0.01);
  });
});


describe('clavicleRestoreFromArmDir', () => {
  it('allows shoulder restore only for hang-like bind upper-arm dirY', () => {
    expect(clavicleRestoreFromArmDir(-0.35)).toBe(true);
    expect(clavicleRestoreFromArmDir(-0.351)).toBe(true);
    expect(clavicleRestoreFromArmDir(-0.6)).toBe(true);
    expect(clavicleRestoreFromArmDir(-0.34)).toBe(false);
    expect(clavicleRestoreFromArmDir(0)).toBe(false);
    expect(clavicleRestoreFromArmDir(0.35)).toBe(false);
  });
});
