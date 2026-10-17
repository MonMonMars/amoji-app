import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { clipFreesFeet, pinPlantedClipTracks, sharedGroundY, FootPlanter } from '../lib/vrm/plant-feet';
import { createV1Avatar } from '../lib/vrm/avatar';

describe('clipFreesFeet', () => {
  it('lets walk and jump lift the feet and plants everything else', () => {
    expect(clipFreesFeet('Jump')).toBe(true);
    expect(clipFreesFeet('Walk')).toBe(true);
    expect(clipFreesFeet('Jog')).toBe(true);
    expect(clipFreesFeet('Run')).toBe(true);
    expect(clipFreesFeet('IdleNeutral')).toBe(false);
    expect(clipFreesFeet('IdleBreathCalm')).toBe(false);
    expect(clipFreesFeet('Dance')).toBe(false);
    expect(clipFreesFeet(null)).toBe(false);
  });
});

describe('sharedGroundY', () => {
  it('uses the lower sole so both feet share one contact', () => {
    expect(sharedGroundY(0.04, 0)).toBe(0);
    expect(sharedGroundY(-0.01, 0.02)).toBe(-0.01);
  });
});

describe('pinPlantedClipTracks', () => {
  it('freezes hips and leg keys and leaves the spine alone', () => {
    const rest = new Map([
      ['hips', { q: new THREE.Quaternion(), p: new THREE.Vector3(0, 1, 0) }],
      ['leftFoot', { q: new THREE.Quaternion(), p: new THREE.Vector3(0, 0, 0) }],
    ]);
    const clip = new THREE.AnimationClip('idle', 1, [
      new THREE.VectorKeyframeTrack('hips.position', [0, 1], [0.4, 1.2, 0.3, 0.5, 1.4, 0.2]),
      new THREE.QuaternionKeyframeTrack('leftFoot.quaternion', [0], [0, 0, 0.3, 0.95]),
      new THREE.QuaternionKeyframeTrack('spine.quaternion', [0], [0.2, 0, 0, 0.98]),
    ]);
    pinPlantedClipTracks(clip, rest);
    expect(Array.from(clip.tracks[0]!.values)).toEqual([0, 1, 0, 0, 1, 0]);
    expect(clip.tracks[1]!.values[2]).toBe(0);
    expect(clip.tracks[2]!.values[0]).toBeCloseTo(0.2);
  });
});

function chain(side: 'left' | 'right', hips: THREE.Object3D, ankleDrop: number): Record<string, THREE.Object3D> {
  const sign = side === 'left' ? 1 : -1;
  const upper = new THREE.Object3D();
  upper.name = `${side}UpperLeg`;
  upper.position.set(0.12 * sign, 0, 0);
  const lower = new THREE.Object3D();
  lower.name = `${side}LowerLeg`;
  lower.position.set(0, -0.45, 0);
  const foot = new THREE.Object3D();
  foot.name = `${side}Foot`;
  foot.position.set(0, -0.45 + ankleDrop, 0);
  const toes = new THREE.Object3D();
  toes.name = `${side}Toes`;
  toes.position.set(0, -0.04, 0.08);
  foot.add(toes);
  lower.add(foot);
  upper.add(lower);
  hips.add(upper);
  return { [`${side}UpperLeg`]: upper, [`${side}LowerLeg`]: lower, [`${side}Foot`]: foot, [`${side}Toes`]: toes };
}

describe('FootPlanter', () => {
  it('puts both feet back on one ground height after a hip slide and a knee bend', () => {
    const inner = new THREE.Group();
    const hips = new THREE.Object3D();
    hips.name = 'hips';
    hips.position.set(0, 0.9, 0);
    inner.add(hips);
    const bones: Record<string, THREE.Object3D> = { hips, ...chain('left', hips, 0), ...chain('right', hips, 0.03) };
    inner.updateMatrixWorld(true);
    const planter = new FootPlanter();
    planter.capture(inner, (name) => bones[name] ?? null);

    const leftRest = bones.leftFoot!.getWorldPosition(new THREE.Vector3());
    const rightRest = bones.rightFoot!.getWorldPosition(new THREE.Vector3());
    const ground = Math.min(leftRest.y, rightRest.y);

    hips.position.y += 0.12;
    hips.position.x += 0.2;
    bones.leftUpperLeg!.rotation.x = 0.5;
    bones.rightUpperLeg!.rotation.x = -0.35;
    inner.updateMatrixWorld(true);
    const liftedL = bones.leftFoot!.getWorldPosition(new THREE.Vector3());
    const liftedR = bones.rightFoot!.getWorldPosition(new THREE.Vector3());
    expect(liftedL.y).toBeGreaterThan(ground + 0.02);
    expect(liftedR.y).toBeGreaterThan(ground + 0.02);

    planter.apply();
    inner.updateMatrixWorld(true);
    const left = bones.leftFoot!.getWorldPosition(new THREE.Vector3());
    const right = bones.rightFoot!.getWorldPosition(new THREE.Vector3());
    expect(left.y).toBeCloseTo(ground, 2);
    expect(right.y).toBeCloseTo(ground, 2);
    expect(left.y).toBeCloseTo(right.y, 2);
    expect(left.x).toBeCloseTo(leftRest.x, 2);
    expect(right.x).toBeCloseTo(rightRest.x, 2);
    expect(hips.position.x).toBeCloseTo(0, 5);
  });
});

describe('seed VRM planted feet', () => {
  it('drops a knee-bent hover so both raw soles share the rest ground', async () => {
    const url = fileURLToPath(new URL('../public/models/seed-san.vrm', import.meta.url));
    const buf = readFileSync(url);
    (globalThis as { self?: unknown }).self ??= globalThis;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    // Node has no image decoder; the skeleton is what this test measures.
    const error = console.error;
    const warn = console.warn;
    console.error = () => {};
    console.warn = () => {};
    let gltf: Awaited<ReturnType<GLTFLoader['parseAsync']>>;
    try {
      gltf = await loader.parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
    } finally {
      console.error = error;
      console.warn = warn;
    }
    const vrm = gltf.userData.vrm;
    const avatar = createV1Avatar(vrm);
    avatar.root.updateMatrixWorld(true);
    const world = (node: THREE.Object3D) => node.getWorldPosition(new THREE.Vector3());
    const left = vrm.humanoid.getRawBoneNode('leftFoot');
    const right = vrm.humanoid.getRawBoneNode('rightFoot');
    avatar.update(0);
    const restL = world(left);
    const restR = world(right);
    const ground = Math.min(restL.y, restR.y);

    const hips = avatar.getBoneNode('hips')!;
    const lU = avatar.getBoneNode('leftUpperLeg')!;
    const rU = avatar.getBoneNode('rightUpperLeg')!;
    const lL = avatar.getBoneNode('leftLowerLeg')!;
    const rL = avatar.getBoneNode('rightLowerLeg')!;
    hips.position.y += 0.06;
    hips.position.x += 0.15;
    lU.rotation.x = 0.55;
    rU.rotation.x = 0.4;
    lL.rotation.x = 0.45;
    rL.rotation.x = 0.3;
    avatar.update(0);
    const hoverL = world(left).y;
    const hoverR = world(right).y;
    expect(hoverL).toBeGreaterThan(ground + 0.02);
    expect(hoverR).toBeGreaterThan(ground + 0.02);

    avatar.plantFeet(true);
    avatar.update(0);
    const plantedL = world(left);
    const plantedR = world(right);
    expect(Math.abs(plantedL.y - plantedR.y)).toBeLessThan(0.01);
    expect(plantedL.y).toBeCloseTo(ground, 2);
    expect(plantedR.y).toBeCloseTo(ground, 2);
    expect(plantedL.x).toBeCloseTo(restL.x, 2);
    expect(plantedR.x).toBeCloseTo(restR.x, 2);
  });
});
