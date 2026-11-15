/**
 * Locks opposite-of-push recoil: finger push screen-left → head tips screen-right.
 * Guards against flip-flopping ±pushSide without checking bone tip direction.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { lateralFallAwayFromScreenSide, pokeBodyReaction } from '../lib/poke-hit';
import { createV1Avatar } from '../lib/vrm/avatar';

describe('poke lean direction (VRM)', () => {
  it('face-on left push recoils the head toward screen-right (opposite of push)', async () => {
    const url = fileURLToPath(new URL('../public/models/seed-san.vrm', import.meta.url));
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
      gltf = await loader.parseAsync(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        '',
      );
    } finally {
      console.error = error;
      console.warn = warn;
    }
    const avatar = createV1Avatar(gltf.userData.vrm);
    avatar.update(0);
    const head = avatar.getBoneNode('head')!;
    const world = (n: THREE.Object3D) => n.getWorldPosition(new THREE.Vector3());
    const restX = world(head).x;

    // Push on screen-left (−1) → fall away to +X face-on.
    const fall = lateralFallAwayFromScreenSide({ x: 1, z: 0 }, -1);
    expect(fall.x).toBeGreaterThan(0);

    const hit = pokeBodyReaction({
      t: 0.12,
      zone: 'side',
      fallX: fall.x,
      fallZ: fall.z,
      sideSign: 1, // character-right arm on screen-left
      softChest: false,
      twist: 0,
      direction: 'left',
    });
    avatar.applyPose({
      headX: 0, headY: 0, headZ: 0,
      headPitchAdd: hit.headX, headRollAdd: hit.headZ,
      spineX: 0, chestX: 0,
      leftUpperArm: 1.1, rightUpperArm: 1.1,
      leftLowerArm: 0.3, rightLowerArm: 0.3,
      spineY: hit.spineYaw, chestZ: hit.chestRoll,
      lArmX: hit.lArmX, rArmX: hit.rArmX,
      lElbowZ: hit.lElbowZ, rElbowZ: hit.rElbowZ,
      spinePitchAdd: hit.spinePitch, chestPitchAdd: hit.chestPitch,
      lArmRaise: -hit.lArmUp, rArmRaise: -hit.rArmUp,
    });
    avatar.plantFeet(true, {
      pitch: hit.hipPitch,
      roll: hit.hipRoll,
      shiftX: hit.hipShiftX,
      shiftZ: hit.hipShiftZ,
    });
    avatar.update(0);
    expect(world(head).x).toBeGreaterThan(restX + 0.05);
  });
});
