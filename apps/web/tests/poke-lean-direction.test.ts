/**
 * Locks Owner R13 same-side poke lean: a finger push on screen-left tips the
 * head AND chest screen-left, and a screen-right push mirrors it. #554 encoded
 * the opposite ("recoil away") and the owner reported the movement was still
 * wrong; this is the VRM end-to-end guard, run for both sides so a lateral
 * sign flip cannot hide behind a single-sided assertion.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import {
  flipPokeFallToFingerSide,
  lateralFallTowardScreenSide,
  pokeBodyReaction,
  type PokeBody,
  type PokeDirection,
} from '../lib/poke-hit';
import { createV1Avatar, type Avatar } from '../lib/vrm/avatar';

async function loadAvatar(): Promise<Avatar> {
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
  return createV1Avatar(gltf.userData.vrm);
}

/** The CompanionCanvas lateral path: toward the finger, then anchored. */
function canvasSideFall(leanSide: number): { fallX: number; fallZ: number } {
  const lean = lateralFallTowardScreenSide({ x: 1, z: 0 }, leanSide);
  const anchored = flipPokeFallToFingerSide(lean, { x: 1, z: 0 }, leanSide);
  return { fallX: anchored.x, fallZ: anchored.z };
}

function applySide(
  avatar: Avatar,
  fall: { fallX: number; fallZ: number },
  sideSign: number,
  direction: PokeDirection,
): PokeBody {
  const hit = pokeBodyReaction({
    t: 0.12,
    zone: 'side',
    fallX: fall.fallX,
    fallZ: fall.fallZ,
    sideSign,
    softChest: false,
    twist: 0,
    direction,
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
  return hit;
}

describe('poke lean direction (VRM)', () => {
  it('face-on left push tips head and chest toward screen-left (same side)', async () => {
    const avatar = await loadAvatar();
    avatar.update(0);
    const head = avatar.getBoneNode('head')!;
    const chest = avatar.getBoneNode('chest')!;
    const world = (n: THREE.Object3D) => n.getWorldPosition(new THREE.Vector3());
    const restHeadX = world(head).x;
    const restChestX = world(chest).x;

    const fall = canvasSideFall(-1);
    expect(fall.fallX).toBeLessThan(0);

    // sideSign +1 = character-right arm, which faces screen-left.
    applySide(avatar, fall, 1, 'left');
    expect(world(head).x).toBeLessThan(restHeadX - 0.05);
    expect(world(chest).x).toBeLessThan(restChestX - 0.01);

    // Opposite side, same rig: head and chest must mirror.
    const right = canvasSideFall(1);
    expect(right.fallX).toBeGreaterThan(0);
    applySide(avatar, right, -1, 'right');
    expect(world(head).x).toBeGreaterThan(restHeadX + 0.05);
    expect(world(chest).x).toBeGreaterThan(restChestX + 0.01);
  });
});
