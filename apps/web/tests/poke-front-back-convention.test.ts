/**
 * FRONT/BACK POKE CONVENTION (owner 2026-11-26)
 *
 *   "the side poke move is now in the correct blend direction, but at the same
 *    time you have flipped the front and back poke move direction, please
 *    reverse only the front and back direction."
 *
 * The sign has been flipped back and forth several times, so this file pins the
 * whole chain numerically instead of a "looks right" number:
 *
 *   camera                 +Z, looking −Z            (CompanionCanvas.applyCamera, theta = 0)
 *   character-forward      +Z  → TOWARD the camera   (lib/vrm/avatar.ts calibrateFacing)
 *   classifyPoke.impulse   punch TRAVEL vector       (front hit travels −Z → −1)
 *   spinePitch > 0         chest +Z (toward camera)  (measured below on seed-san.vrm)
 *   spinePitch < 0         chest −Z (away from camera)
 *
 * Desired behaviour:
 *   FRONT poke → she leans BACK, away from the camera  → spinePitch < 0
 *   BACK  poke → she leans FORWARD, toward the camera  → spinePitch > 0
 *
 * `axialRecoilFall()` in lib/poke-hit.ts is the single place that decides it;
 * CompanionCanvas is its only call site. The pinned "toward the poke" numbers
 * in poke-hit.test.ts / poke-side-lean.test.ts are the ENGINE's own contract
 * and stay untouched — this test drives the live canvas path end to end and
 * measures the actual VRM skeleton, so a hand-flip of either layer fails here.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import {
  axialRecoilFall,
  classifyPoke,
  lateralFallTowardScreenSide,
  type PokeClass,
} from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';
import { createV1Avatar, type Avatar } from '../lib/vrm/avatar';

const root = path.resolve(import.meta.dirname, '..');

// Seed-san bind pose (same frame as poke-side-lean / poke-side-geometry):
// leftShoulder +X, rightShoulder −X → character-right = −X, forward = +Z.
const HIPS = { x: 0, y: 0.796, z: -0.034 };
const HEAD = { x: 0, y: 1.332, z: -0.012 };
const CHEST = { x: 0, y: 1.056, z: -0.009 };
const LEFT_SHOULDER = { x: 0.043, y: 1.266, z: 0.019 };
const RIGHT_SHOULDER = { x: -0.043, y: 1.266, z: 0.019 };
const HALF_DEPTH = 0.13;
const CAMERA_DIST = 2.4;

/** Home camera: on +Z at chest height. Behind her: on −Z. */
const CAMERA_FRONT = { x: 0, y: 1.05, z: HIPS.z + HALF_DEPTH + CAMERA_DIST };
const CAMERA_BACK = { x: 0, y: 1.05, z: HIPS.z - HALF_DEPTH - CAMERA_DIST };

const FRONT_CONTACT = { x: 0, y: 1.05, z: HIPS.z + HALF_DEPTH };
const BACK_CONTACT = { x: 0, y: 1.05, z: HIPS.z - HALF_DEPTH };

function cameraRay(hit: { x: number; y: number; z: number }, camera: typeof CAMERA_FRONT) {
  const dx = hit.x - camera.x;
  const dy = hit.y - camera.y;
  const dz = hit.z - camera.z;
  const len = Math.hypot(dx, dy, dz);
  return { x: dx / len, y: dy / len, z: dz / len };
}

function classify(hit: { x: number; y: number; z: number }, camera: typeof CAMERA_FRONT) {
  return classifyPoke(hit, HIPS, HEAD, CHEST, LEFT_SHOULDER, RIGHT_SHOULDER, {
    rayDir: cameraRay(hit, camera),
  });
}

/**
 * Exactly the CompanionCanvas path for a centred tap: the fall starts as the
 * punch travel, then the single axial decision, then the tier reaction.
 * (A centred tap takes the `cls.impulse` branch: no finger-offset blend.)
 */
function bodyFor(
  hit: { x: number; y: number; z: number },
  camera: typeof CAMERA_FRONT,
  t = 0.1,
) {
  const cls = classify(hit, camera);
  const bodyFall = axialRecoilFall({ x: cls.impulse.x, z: cls.impulse.z }, cls.zone);
  const section = resolvePokeSection(cls.zone, cls.direction);
  const body = pokeSectionBodyReaction({
    t,
    section,
    hitZone: cls.zone,
    fallX: bodyFall.x,
    fallZ: bodyFall.z,
    sideSign: cls.sideSign,
    softChest: false,
    twist: 0,
  });
  return { cls, bodyFall, section, body };
}

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

/** World z of the chest and head after the poke body is applied. */
function worldZ(avatar: Avatar, body: ReturnType<typeof bodyFor>['body']) {
  avatar.applyPose({
    headX: 0, headY: 0, headZ: 0,
    headPitchAdd: body.headX, headRollAdd: body.headZ,
    spineX: 0, chestX: 0,
    leftUpperArm: 1.1, rightUpperArm: 1.1,
    leftLowerArm: 0.3, rightLowerArm: 0.3,
    spineY: body.spineYaw, chestZ: body.chestRoll,
    lArmX: body.lArmX, rArmX: body.rArmX,
    lElbowZ: body.lElbowZ, rElbowZ: body.rElbowZ,
    spinePitchAdd: body.spinePitch, chestPitchAdd: body.chestPitch,
    lArmRaise: -body.lArmUp, rArmRaise: -body.rArmUp,
  });
  avatar.plantFeet(true, {
    pitch: body.hipPitch,
    roll: body.hipRoll,
    shiftX: body.hipShiftX,
    shiftZ: body.hipShiftZ,
  });
  avatar.update(0);
  const w = (name: string) => avatar.getBoneNode(name)!.getWorldPosition(new THREE.Vector3());
  return { chest: w('chest'), head: w('head') };
}

describe('poke frame convention (traced, not assumed)', () => {
  it('camera sits on +Z and the rig faces it: forward is +Z, right is −X', async () => {
    const avatar = await loadAvatar();
    avatar.update(0);
    const world = (n: string) => avatar.getBoneNode(n)!.getWorldPosition(new THREE.Vector3());
    const ls = world('leftShoulder');
    const rs = world('rightShoulder');
    // classifyPoke: right = rightShoulder − leftShoulder; forward = up × right.
    const right = rs.clone().sub(ls);
    right.y = 0;
    right.normalize();
    const forward = { x: right.z, z: -right.x };
    expect(right.x).toBeCloseTo(-1, 3); // character-right = −X (screen-left)
    expect(forward.z).toBeCloseTo(1, 3); // forward = +Z = toward the +Z camera
    // Bind-pose rest depths used by the front/back contacts below.
    expect(world('chest').z).toBeCloseTo(CHEST.z, 3);
  });
});

describe('front/back lean: away from the camera on the front, toward it on the back', () => {
  it('a FRONT chest poke travels −Z and leans her BACK, away from the camera', async () => {
    const { cls, bodyFall, body } = bodyFor(FRONT_CONTACT, CAMERA_FRONT);
    // Classification is untouched: front label + voice slot, travel −Z.
    expect(cls.zone).toBe('chest');
    expect(cls.direction).toBe('front');
    expect(cls.impulse.z).toBeCloseTo(-1, 2);
    // THE decision: the axial component handed to the body is mirrored.
    expect(bodyFall.z).toBeCloseTo(1, 6);
    expect(bodyFall.x).toBeCloseTo(0, 6);
    // Negative = chest toward −Z = away from a camera at +Z.
    expect(body.spinePitch).toBeLessThan(-0.25);
    expect(body.chestPitch).toBeLessThan(0);
    expect(body.headX).toBeLessThan(0);
    // Mirror of the r291-pinned section number (0.341 toward → −0.341 away).
    expect(body.spinePitch).toBeCloseTo(-0.341, 2);

    const avatar = await loadAvatar();
    avatar.update(0);
    const rest = avatar.getBoneNode('chest')!.getWorldPosition(new THREE.Vector3());
    const posed = worldZ(avatar, body);
    expect(posed.chest.z).toBeLessThan(rest.z - 0.02);
    expect(posed.head.z).toBeLessThan(-0.06);
  });

  it('a BACK poke travels +Z and leans her FORWARD, toward the camera', async () => {
    const { cls, bodyFall, body } = bodyFor(BACK_CONTACT, CAMERA_BACK);
    expect(cls.zone).toBe('back');
    expect(cls.direction).toBe('back');
    expect(cls.impulse.z).toBeCloseTo(1, 2);
    expect(bodyFall.z).toBeCloseTo(-1, 6);
    // Positive = chest toward +Z = toward the camera.
    expect(body.spinePitch).toBeGreaterThan(0.3);
    expect(body.chestPitch).toBeGreaterThan(0);
    expect(body.headX).toBeGreaterThan(0);

    const avatar = await loadAvatar();
    avatar.update(0);
    const rest = avatar.getBoneNode('chest')!.getWorldPosition(new THREE.Vector3());
    const posed = worldZ(avatar, body);
    expect(posed.chest.z).toBeGreaterThan(rest.z + 0.02);
    expect(posed.head.z).toBeGreaterThan(0.06);
  });

  /**
   * THE owner invariant (2026-11-26): "the front and back should mirror the poke
   * move." A front poke and a back poke are one movement reflected through her
   * lateral (XY) plane — same amplitude, same spring shape, opposite forward
   * sign. Asserting a hard-coded sign only (the old test) let the two sides
   * drift apart by ~20% in magnitude on a separately tuned recipe.
   *
   * Axial components (forward/back pitch + Z shift + arm swing) must negate;
   * lateral and guard components (roll, yaw, X shift, elbows) must be equal —
   * the arms are in the same guard, they just swing the other way.
   */
  it('is an exact mirror at every point of the punch: axial negates, lateral holds', () => {
    const axial = ['spinePitch', 'chestPitch', 'headX', 'hipPitch', 'hipShiftZ', 'lArmX', 'rArmX'] as const;
    const lateral = ['spineYaw', 'chestRoll', 'headZ', 'hipRoll', 'hipShiftX', 'lElbowZ', 'rElbowZ', 'lArmUp', 'rArmUp'] as const;
    for (const t of [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.55, 0.8, 1, 1.2]) {
      const front = bodyFor(FRONT_CONTACT, CAMERA_FRONT, t).body;
      const back = bodyFor(BACK_CONTACT, CAMERA_BACK, t).body;
      for (const key of axial) {
        // Same magnitude, opposite sign — exact, not "close enough at 2dp".
        expect(front[key], `${key} t=${t}`).toBeCloseTo(-back[key], 12);
        expect(Math.abs(front[key]), `${key} magnitude t=${t}`).toBeCloseTo(Math.abs(back[key]), 12);
      }
      for (const key of lateral) {
        expect(front[key], `${key} t=${t}`).toBeCloseTo(back[key], 12);
      }
    }
  });

  it('is a mirror in the rig too: the chest and head travel equal and opposite on Z', async () => {
    const avatar = await loadAvatar();
    avatar.update(0);
    const restChest = avatar.getBoneNode('chest')!.getWorldPosition(new THREE.Vector3());
    const restHead = avatar.getBoneNode('head')!.getWorldPosition(new THREE.Vector3());
    // Sign is only meaningful inside the punch (by t≈0.35 the rebound has
    // already crossed the rest pose); the mirror sum holds at every sample.
    for (const t of [0.05, 0.1, 0.2, 0.35]) {
      const front = worldZ(avatar, bodyFor(FRONT_CONTACT, CAMERA_FRONT, t).body);
      const back = worldZ(avatar, bodyFor(BACK_CONTACT, CAMERA_BACK, t).body);
      const frontDz = front.chest.z - restChest.z;
      const backDz = back.chest.z - restChest.z;
      if (t <= 0.2) {
        expect(frontDz, `chest z t=${t}`).toBeLessThan(0);
        expect(backDz, `chest z t=${t}`).toBeGreaterThan(0);
      }
      // Chest: the two displacements cancel to a fraction of a millimetre.
      expect(Math.abs(frontDz + backDz), `chest mirror t=${t}`).toBeLessThan(0.001);
      const frontHeadDz = front.head.z - restHead.z;
      const backHeadDz = back.head.z - restHead.z;
      expect(Math.sign(frontHeadDz), `head sign t=${t}`).toBe(-Math.sign(backHeadDz));
      // Head: same travel to within ~3% — the rig's rest chain (neck/head bone
      // offsets) is not Z-symmetric, so the accumulated rotations leave under a
      // centimetre of residual on a 1.3 m avatar. The old recipes differed by 20%.
      expect(
        Math.abs(frontHeadDz + backHeadDz),
        `head mirror t=${t}`,
      ).toBeLessThan(Math.abs(frontHeadDz) * 0.05 + 0.001);
    }
  });

  it('is a single sign on Z: same magnitude, opposite sign, whatever the zone', () => {
    for (const zone of ['chest', 'torso', 'belly', 'back', 'butt', 'head', 'armL', 'legR'] as const) {
      expect(axialRecoilFall({ x: 0.2, z: -0.98 }, zone)).toEqual({ x: 0.2, z: 0.98 });
      expect(axialRecoilFall({ x: -0.2, z: 0.98 }, zone)).toEqual({ x: -0.2, z: -0.98 });
    }
  });
});

describe('lateral / side behaviour is untouched', () => {
  it('zone `side` is returned verbatim — the r291 recipe keeps its own pitch', () => {
    const flank = { x: 0.85, z: -0.53 };
    expect(axialRecoilFall(flank, 'side')).toEqual(flank);
    // …and the side tap's visible lean is still the finger's side (roll sign).
    const lean = lateralFallTowardScreenSide({ x: 1, z: 0 }, -1);
    const sideBody = pokeSectionBodyReaction({
      t: 0.12,
      section: resolvePokeSection('side', 'frontRight'),
      hitZone: 'side',
      fallX: lean.x,
      fallZ: flank.z,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    expect(sideBody.chestRoll).toBeGreaterThan(0.6);
    expect(sideBody.headZ).toBeGreaterThan(0.03);
  });

  it('the lateral lean is a reflection-free pass-through on the X axis', () => {
    const front = axialRecoilFall({ x: -0.4, z: -0.9 }, 'chest');
    expect(front.x).toBe(-0.4);
    expect(front.z).toBe(0.9);
  });
});

describe('CompanionCanvas wiring', () => {
  it('decides the axial sign once, at the section-reaction call', () => {
    const canvas = readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toMatch(/axialRecoilFall\s*\(/);
    expect(canvas).toMatch(/fallX:\s*bodyFall\.x/);
    expect(canvas).toMatch(/fallZ:\s*bodyFall\.z/);
    // The reaction must receive the mirrored vector, not the raw travel.
    expect(canvas).not.toMatch(/fallZ:\s*pokeFallDir\.z/);
    // Labels/voices read the raw travel vector (classification stays put).
    const labelAt = canvas.indexOf('pokeDirection = directionFromAxes(');
    const signAt = canvas.indexOf('const bodyFall = axialRecoilFall(');
    expect(labelAt).toBeGreaterThan(0);
    expect(signAt).toBeGreaterThan(labelAt);
  });
});
