import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import {
  chestBouncePitch,
  chestPokeBounce,
  isBustBoneName,
  CHEST_BOUNCE_SEC,
} from '../lib/vrm/chest-bounce';
import { createV1Avatar } from '../lib/vrm/avatar';

describe('chest bounce', () => {
  it('only names secondary bust bones', () => {
    expect(isBustBoneName('J_Sec_L_Bust1')).toBe(true);
    expect(isBustBoneName('J_Sec_R_Bust2')).toBe(true);
    expect(isBustBoneName('J_Bip_C_Chest')).toBe(false);
    expect(isBustBoneName('J_Bip_C_UpperChest')).toBe(false);
    expect(isBustBoneName('hips')).toBe(false);
  });

  it('is a damped spring on chest and torso, and stays off for other zones', () => {
    expect(chestPokeBounce('head', 0.12)).toBe(0);
    expect(chestPokeBounce('side', 0.12)).toBe(0);
    expect(chestPokeBounce('armL', 0.12)).toBe(0);
    expect(chestPokeBounce('legR', 0.12)).toBe(0);
    expect(chestBouncePitch(0)).toBe(0);
    expect(chestBouncePitch(CHEST_BOUNCE_SEC + 0.01)).toBe(0);
    const early = chestBouncePitch(0.08);
    expect(early).toBeLessThan(0);
    expect(Math.abs(early)).toBeGreaterThan(0.1);
    expect(Math.abs(early)).toBeLessThan(0.35);
    const torso = chestPokeBounce('torso', 0.08);
    expect(torso).toBeLessThan(0);
    expect(Math.abs(torso)).toBeLessThan(Math.abs(early));
    let rebound = false;
    for (let t = 0; t <= CHEST_BOUNCE_SEC; t += 0.02) {
      const p = chestBouncePitch(t);
      expect(Math.abs(p)).toBeLessThanOrEqual(0.3);
      if (p > 0.01) rebound = true;
    }
    expect(rebound).toBe(true);
  });
});

describe('kitagawa chest poke', () => {
  it('springs the bust and leaves both feet on the ground', async () => {
    const url = fileURLToPath(new URL('../public/models/cast/kitagawa.vrm', import.meta.url));
    const buf = readFileSync(url);
    (globalThis as { self?: unknown }).self ??= globalThis;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
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
    avatar.update(0);
    const world = (node: THREE.Object3D) => node.getWorldPosition(new THREE.Vector3());
    let bust: THREE.Object3D | null = null;
    let tip: THREE.Object3D | null = null;
    vrm.scene.traverse((o: THREE.Object3D) => {
      if (o.name === 'J_Sec_L_Bust1') bust = o;
      if (o.name === 'J_Sec_L_Bust2') tip = o;
    });
    expect(bust).not.toBeNull();
    expect(tip).not.toBeNull();
    const left = vrm.humanoid.getRawBoneNode('leftFoot')!;
    const right = vrm.humanoid.getRawBoneNode('rightFoot')!;
    const footL = world(left).y;
    const footR = world(right).y;
    const tipRest = world(tip!);
    avatar.plantFeet(true);
    avatar.applyChestBounce(chestPokeBounce('chest', 0.08));
    const tipMoved = world(tip!);
    expect(tipMoved.distanceTo(tipRest)).toBeGreaterThan(0.004);
    expect(tipMoved.distanceTo(tipRest)).toBeLessThan(0.12);
    expect(world(left).y).toBeCloseTo(footL, 4);
    expect(world(right).y).toBeCloseTo(footR, 4);
    avatar.applyChestBounce(0);
    expect(world(tip!).distanceTo(tipRest)).toBeLessThan(0.0005);
  });
});
