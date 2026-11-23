/**
 * Owner 2026-11-22 — second lateral report, after the r290 axial fix:
 *
 *   "the side poke also blended to the opposite side ... the poke area of side
 *    is too small and always result in poke front and back even I poke on the
 *    side. please make the side area larger and make the blend opposite"
 *
 * Two things are pinned here:
 *
 *   1. the side zone is wide enough that a flank a human calls "the side"
 *      resolves lateral — measured against the shipped VRM's torso
 *      (a ≈ 0.17 m half-width, b ≈ 0.13 m half-depth), not a feel number;
 *   2. the lateral lean sign follows the finger's screen side, and the axial
 *      (front/back) fields are bit-identical to the owner-confirmed r290
 *      output. The r290 numbers below are the same ones pinned in
 *      poke-hit.test.ts, repeated here so a lateral fix that leaks into the
 *      axial axis fails in this file too.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyPoke,
  flipPokeFallToFingerSide,
  lateralFallTowardScreenSide,
  pokeBodyReaction,
} from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';

const root = path.resolve(import.meta.dirname, '..');

// Seed-san bind-pose frame measured from public/models/seed-san.vrm.
// Left shoulder is +X and right is −X, so the character's right = screen-left
// (the camera sits on +Z): rightN = (−1, 0), forward = (0, +1).
const HIPS = { x: 0, y: 0.796, z: -0.034 };
const HEAD = { x: 0, y: 1.332, z: -0.012 };
const CHEST = { x: 0, y: 1.056, z: -0.009 };
const LEFT_SHOULDER = { x: 0.043, y: 1.266, z: 0.019 };
const RIGHT_SHOULDER = { x: -0.043, y: 1.266, z: 0.019 };
const CAMERA_RIGHT = { x: 1, z: 0 };
const CAMERA_DIST = 2.4;

// Torso ellipse sampled from the bind-pose vertex bands (see poke-hit.ts).
const HALF_WIDTH = 0.17;
const HALF_DEPTH = 0.13;

/** Front surface point of the torso ellipse at a given lateral offset. */
function torsoSurface(x: number, y = CHEST.y) {
  const t = Math.min(1, Math.abs(x) / HALF_WIDTH);
  const z = HIPS.z + HALF_DEPTH * Math.cos(Math.asin(t));
  return { x, y, z };
}

/** Ray from a camera 2.4 m in front of the chest toward the contact. */
function cameraRay(hit: { x: number; y: number; z: number }) {
  const dx = hit.x;
  const dz = hit.z - (CHEST.z + CAMERA_DIST);
  const len = Math.hypot(dx, dz);
  return { x: dx / len, y: 0, z: dz / len };
}

function classifyAt(hit: { x: number; y: number; z: number }) {
  return classifyPoke(hit, HIPS, HEAD, CHEST, LEFT_SHOULDER, RIGHT_SHOULDER, {
    rayDir: cameraRay(hit),
  });
}

/** Exactly the CompanionCanvas blend + its finger-side anchor. */
function canvasFall(
  hit: { x: number; y: number; z: number },
  leanSide: number,
) {
  const cls = classifyAt(hit);
  const lean = lateralFallTowardScreenSide(CAMERA_RIGHT, leanSide);
  const lateralOnly =
    cls.zone === 'side' || cls.zone === 'armL' || cls.zone === 'armR' || cls.zone === 'hand';
  // ~14 CSS px at the 2.4 m home camera on a phone-width canvas.
  const fingerOffCenter = Math.abs(hit.x - HIPS.x) > 0.026;
  let x: number;
  let z: number;
  if (lateralOnly) {
    x = cls.impulse.x * 0.35 + lean.x * 0.85;
    z = cls.impulse.z * 0.55 + lean.z * 0.35;
  } else if (fingerOffCenter) {
    x = cls.impulse.x * 0.7 + lean.x * 0.55;
    z = cls.impulse.z * 0.85 + lean.z * 0.3;
  } else {
    x = cls.impulse.x;
    z = cls.impulse.z;
  }
  const len = Math.hypot(x, z);
  const blended = len > 1e-6 ? { x: x / len, z: z / len } : { x: lean.x, z: lean.z };
  const anchored = flipPokeFallToFingerSide(blended, CAMERA_RIGHT, leanSide);
  return { cls, fall: anchored };
}

describe('side zone width (VRM geometry)', () => {
  it('classifies a half-width flank as side, not front or back', () => {
    // 85 mm = half of the 170 mm torso half-width, still on the visible front
    // surface (z ≈ +0.079 m in front of the hips bone).
    const halfFlank = classifyAt(torsoSurface(-HALF_WIDTH / 2));
    expect(halfFlank.zone).toBe('side');
    expect(halfFlank.direction).toBe('frontLeft');

    const midFlank = classifyAt(torsoSurface(-0.075));
    expect(midFlank.zone).toBe('side');
    expect(['frontLeft', 'left', 'backLeft']).toContain(midFlank.direction);

    // A dead-centre tap is still a chest/front poke, not a side one.
    const centre = classifyAt(torsoSurface(0));
    expect(centre.zone).toBe('chest');
    expect(centre.direction).toBe('front');

    // Well inside the flank (35% of the half-width) stays axial.
    const inner = classifyAt(torsoSurface(-0.06));
    expect(inner.zone).not.toBe('side');
  });

  it('widens the old 0.9 ratio without collapsing the dead-centre guard', () => {
    // Owner case: x = 75 mm, front-surface f ≈ 117 mm. The old ratio called
    // this front (0.075 < 0.9 × 0.117); the geometry ratio calls it side.
    const hit = torsoSurface(-0.075);
    const f = hit.z - HIPS.z;
    expect(Math.abs(hit.x)).toBeLessThan(0.9 * f);
    expect(Math.abs(hit.x)).toBeGreaterThan(0.55 * f);
    expect(classifyAt(hit).zone).toBe('side');
    // 40 mm of dead centre remains the minimum lateral offset.
    expect(classifyAt(torsoSurface(-0.03)).zone).not.toBe('side');
  });

  it('mirrors the side zone on the other flank', () => {
    const right = classifyAt(torsoSurface(HALF_WIDTH / 2));
    expect(right.zone).toBe('side');
    expect(right.direction).toBe('frontRight');
    expect(right.sideSign).toBe(-1);
  });

  it('promotes a depth-dominated ray octant to the contact diagonal', () => {
    // The camera ray for a flank tap is almost pure −Z (front); the lateral
    // octant has to come from the contact offset, or labels/voices read front.
    const cls = classifyAt(torsoSurface(-0.15));
    expect(cls.impulse.z).toBeLessThan(-0.99);
    expect(Math.abs(cls.impulse.x)).toBeLessThan(0.1);
    expect(cls.direction).toBe('frontLeft');
    expect(cls.zone).toBe('side');
  });
});

describe('lateral lean follows the finger side', () => {
  it('screen-left tap leans screen-left (numeric fields, not just a difference)', () => {
    const { cls, fall } = canvasFall(torsoSurface(-0.15), -1);
    expect(cls.zone).toBe('side');
    expect(fall.x).toBeLessThan(-0.5);
    expect(fall.z).toBeLessThan(0);

    const section = resolvePokeSection('side', cls.direction);
    expect(section.angle).toBe('frontLeft');
    const body = pokeSectionBodyReaction({
      t: 0.12,
      section,
      hitZone: 'side',
      fallX: fall.x,
      fallZ: fall.z,
      sideSign: cls.sideSign,
      softChest: false,
      twist: 0,
    });
    // Positive chestRoll = world +Z rotation = top toward −X = screen-left.
    expect(body.chestRoll).toBeGreaterThan(0.6);
    expect(body.headZ).toBeGreaterThan(0.03);
    expect(body.hipRoll).toBeGreaterThan(0.12);
    expect(body.hipShiftX).toBeLessThan(0);
    // Near arm is the character-right arm (screen-left when she faces us).
    expect(Math.abs(body.rArmX)).toBeGreaterThan(Math.abs(body.lArmX));
    expect(Math.abs(body.rArmX)).toBeGreaterThan(0.8);
  });

  it('screen-right tap is the exact mirror', () => {
    const { cls, fall } = canvasFall(torsoSurface(0.15), 1);
    expect(cls.zone).toBe('side');
    expect(fall.x).toBeGreaterThan(0.5);
    expect(fall.z).toBeLessThan(0);

    const section = resolvePokeSection('side', cls.direction);
    expect(section.angle).toBe('frontRight');
    const body = pokeSectionBodyReaction({
      t: 0.12,
      section,
      hitZone: 'side',
      fallX: fall.x,
      fallZ: fall.z,
      sideSign: cls.sideSign,
      softChest: false,
      twist: 0,
    });
    expect(body.chestRoll).toBeLessThan(-0.6);
    expect(body.headZ).toBeLessThan(-0.03);
    expect(body.hipRoll).toBeLessThan(-0.12);
    expect(body.hipShiftX).toBeGreaterThan(0);
    expect(Math.abs(body.lArmX)).toBeGreaterThan(Math.abs(body.rArmX));
    expect(Math.abs(body.lArmX)).toBeGreaterThan(0.8);

    // Same gesture, mirrored: not merely an opposite sign on one field.
    const left = canvasFall(torsoSurface(-0.15), -1);
    const leftBody = pokeSectionBodyReaction({
      t: 0.12,
      section: resolvePokeSection('side', left.cls.direction),
      hitZone: 'side',
      fallX: left.fall.x,
      fallZ: left.fall.z,
      sideSign: left.cls.sideSign,
      softChest: false,
      twist: 0,
    });
    expect(body.chestRoll).toBeCloseTo(-leftBody.chestRoll, 6);
    expect(body.headZ).toBeCloseTo(-leftBody.headZ, 6);
    expect(body.spinePitch).toBeCloseTo(leftBody.spinePitch, 6);
  });

  it('flips only the lateral axis when a mesh ray points the wrong way', () => {
    // A ray/normal/frame that hands the fall a +X lateral on a screen-left
    // tap must not lean her right. The axial component survives verbatim.
    const inverted = { x: 0.6, z: -0.8 };
    const fixed = flipPokeFallToFingerSide(inverted, CAMERA_RIGHT, -1);
    expect(fixed.x).toBeCloseTo(-0.6, 12);
    expect(fixed.z).toBeCloseTo(-0.8, 12);
    expect(Math.hypot(fixed.x, fixed.z)).toBeCloseTo(1, 12);

    // Already-correct sign is a no-op in both directions.
    expect(flipPokeFallToFingerSide(inverted, CAMERA_RIGHT, 1)).toEqual(inverted);
    expect(flipPokeFallToFingerSide(fixed, CAMERA_RIGHT, -1)).toEqual(fixed);

    const body = (fall: { x: number; z: number }) => pokeBodyReaction({
      t: 0.12, zone: 'side', fallX: fall.x, fallZ: fall.z, sideSign: 1,
      softChest: false, twist: 0, direction: 'left',
    });
    const wrong = body(inverted);
    const right = body(fixed);
    // Lateral flips...
    expect(Math.sign(right.chestRoll)).toBe(-Math.sign(wrong.chestRoll));
    expect(Math.sign(right.headZ)).toBe(-Math.sign(wrong.headZ));
    expect(Math.sign(right.hipShiftX)).toBe(-Math.sign(wrong.hipShiftX));
    // ...and the axial lean is identical (front/back untouched).
    expect(right.spinePitch).toBeCloseTo(wrong.spinePitch, 12);
    expect(right.chestPitch).toBeCloseTo(wrong.chestPitch, 12);
    expect(right.headX).toBeCloseTo(wrong.headX, 12);
    expect(right.hipPitch).toBeCloseTo(wrong.hipPitch, 12);
    expect(right.hipShiftZ).toBeCloseTo(wrong.hipShiftZ, 12);
  });
});

describe('front/back stays exactly at r290', () => {
  it('centre front/back axial numbers are unchanged', () => {
    // The same expectations as poke-hit.test.ts — duplicated so a lateral
    // change that touches the axial path fails here too.
    const front = pokeBodyReaction({
      t: 0.1, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1,
      softChest: false, twist: 0, direction: 'front',
    });
    const back = pokeBodyReaction({
      t: 0.1, zone: 'torso', fallX: 0, fallZ: 1, sideSign: 1,
      softChest: false, twist: 0, direction: 'back',
    });
    expect(front.spinePitch).toBeCloseTo(0.6527, 3);
    expect(front.headX).toBeCloseTo(0.1795, 3);
    expect(front.hipPitch).toBeCloseTo(0.3916, 3);
    expect(back.spinePitch).toBeCloseTo(-0.6500, 3);
    expect(back.headX).toBeCloseTo(-0.1369, 3);
  });

  it('the finger-side anchor is a no-op on a centred front/back fall', () => {
    for (const leanSide of [-1, 1]) {
      expect(flipPokeFallToFingerSide({ x: 0, z: -1 }, CAMERA_RIGHT, leanSide))
        .toEqual({ x: 0, z: -1 });
      expect(flipPokeFallToFingerSide({ x: 0, z: 1 }, CAMERA_RIGHT, leanSide))
        .toEqual({ x: 0, z: 1 });
    }
  });

  it('a front chest poke through the section path keeps its axial numbers', () => {
    const { fall } = canvasFall(torsoSurface(0), 1);
    expect(fall.x).toBeCloseTo(0, 12);
    expect(fall.z).toBeCloseTo(-1, 12);
    const body = pokeSectionBodyReaction({
      t: 0.1,
      section: resolvePokeSection('chest', 'front'),
      hitZone: 'chest',
      fallX: fall.x,
      fallZ: fall.z,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    // Pinned r290 section-path output (shoulder_chest band scale).
    expect(body.spinePitch).toBeCloseTo(0.341, 3);
    expect(body.chestPitch).toBeCloseTo(0.5847, 3);
    expect(body.headX).toBeCloseTo(0.0408, 3);
    expect(body.hipPitch).toBeCloseTo(0.0997, 3);
    expect(body.chestRoll).toBeCloseTo(0, 12);
  });
});

describe('CompanionCanvas wiring', () => {
  it('anchors the lateral fall to the finger and keeps the camera-aware lean', () => {
    const canvas = readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toMatch(/flipPokeFallToFingerSide\s*\(/);
    expect(canvas).toMatch(/lateralFallTowardScreenSide\s*\(/);
    expect(canvas).toMatch(/screenPointerSideSign\s*\(/);
    expect(canvas).toMatch(/directionFromAxes/);
    // The anchor has to run on the final blended vector, not on the raw ray.
    const anchorAt = canvas.indexOf('flipPokeFallToFingerSide(pokeFallDir');
    const blendAt = canvas.indexOf('cls.impulse.x * 0.35 + lean.x * 0.85');
    expect(blendAt).toBeGreaterThan(0);
    expect(anchorAt).toBeGreaterThan(blendAt);
  });
});
