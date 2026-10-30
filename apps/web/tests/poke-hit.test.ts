import { describe, expect, it } from 'vitest';
import { classifyPoke, pokeBodyReaction, pokePunch } from '../lib/poke-hit';

const hips = { x: 0, y: 1, z: 0 };
const head = { x: 0, y: 1.6, z: 0 };
const chest = { x: 0, y: 1.3, z: 0.02 };
const left = { x: -0.2, y: 1.4, z: 0 };
const right = { x: 0.2, y: 1.4, z: 0 };

describe('classifyPoke', () => {
  it('names front head, chest, side, and back', () => {
    // Shoulders along +X → forward is −Z, so a front tap sits in front of the body.
    expect(classifyPoke({ x: 0, y: 1.62, z: -0.2 }, hips, head, chest, left, right).zone).toBe('head');
    expect(classifyPoke({ x: 0, y: 1.28, z: -0.25 }, hips, head, chest, left, right).zone).toBe('chest');
    expect(classifyPoke({ x: 0.4, y: 1.2, z: 0 }, hips, head, chest, left, right).zone).toBe('side');
    expect(classifyPoke({ x: 0, y: 1.2, z: 0.3 }, hips, head, chest, left, right).zone).toBe('back');
  });

  it('pushes away from the contact on the ground plane', () => {
    const front = classifyPoke({ x: 0, y: 1.05, z: -0.3 }, hips, head, chest, left, right);
    expect(front.zone).toBe('torso');
    expect(front.impulse.z).toBeGreaterThan(0);
    expect(front.direction).toBe('front');
  });

  it('names the side the punch came from', () => {
    expect(classifyPoke({ x: 0.4, y: 1.2, z: 0 }, hips, head, chest, left, right).direction).toBe('right');
    expect(classifyPoke({ x: -0.4, y: 1.2, z: 0 }, hips, head, chest, left, right).direction).toBe('left');
    expect(classifyPoke({ x: 0, y: 1.2, z: 0.3 }, hips, head, chest, left, right).direction).toBe('back');
  });

  it('follows the poke ray (then normal) and picks arms, belly, and legs when the contact is there', () => {
    // Prefer rayDir: punch continues through. Front ray from +Z → impulse −Z
    // on a calibrated +Z-facing model; this synthetic frame still uses L=-X/R=+X.
    const punched = classifyPoke(
      { x: 0, y: 1.28, z: -0.2 },
      hips, head, chest, left, right,
      { normal: { x: 0, y: 0, z: -1 }, rayDir: { x: 0, y: 0, z: 1 } },
    );
    expect(punched.zone).toBe('chest');
    expect(punched.impulse.z).toBeGreaterThan(0.9);
    expect(punched.direction).toBe('front');

    const byNormal = classifyPoke(
      { x: 0, y: 1.28, z: -0.2 },
      hips, head, chest, left, right,
      { normal: { x: 0, y: 0, z: -1 } },
    );
    expect(byNormal.impulse.z).toBeGreaterThan(0.9);

    const arm = classifyPoke(
      { x: -0.45, y: 1.05, z: -0.05 },
      hips, head, chest, left, right,
      { leftArm: { x: -0.42, y: 1.02, z: 0 }, rightArm: { x: 0.42, y: 1.02, z: 0 } },
    );
    expect(arm.zone).toBe('armL');

    const belly = classifyPoke(
      { x: 0, y: 1.08, z: -0.12 },
      hips, head, chest, left, right,
      { belly: { x: 0, y: 1.08, z: -0.02 } },
    );
    expect(belly.zone).toBe('belly');

    const leg = classifyPoke(
      { x: 0.16, y: 0.45, z: -0.05 },
      hips, head, chest, left, right,
      { rightLeg: { x: 0.14, y: 0.48, z: 0 }, leftLeg: { x: -0.14, y: 0.48, z: 0 } },
    );
    expect(leg.zone).toBe('legR');
  });
});

describe('pokeBodyReaction', () => {
  const zones = ['head', 'torso', 'chest', 'side', 'back'] as const;

  it('never translates the root', () => {
    for (const zone of zones) {
      const hit = pokeBodyReaction({
        t: 0.15,
        zone,
        fallX: 0.2,
        fallZ: -0.98,
        sideSign: 1,
        softChest: zone === 'chest',
        twist: 0.08,
      });
      expect(hit.rootX).toBe(0);
      expect(hit.rootY).toBe(0);
      expect(hit.rootZ).toBe(0);
    }
  });

  it('keeps a head poke on the head and a torso poke on the spine', () => {
    const head = pokeBodyReaction({ t: 0.2, zone: 'head', fallX: 0, fallZ: -1, sideSign: 1, softChest: false, twist: 0.06 });
    const torso = pokeBodyReaction({ t: 0.2, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1, softChest: false, twist: 0.06 });
    expect(Math.abs(head.headX)).toBeGreaterThan(Math.abs(head.spinePitch));
    expect(head.spinePitch).toBe(0);
    expect(head.chestPitch).toBe(0);
    expect(head.lArmX).toBe(0);
    expect(head.rArmX).toBe(0);
    expect(Math.abs(torso.spinePitch)).toBeGreaterThan(0);
    expect(Math.abs(torso.lArmX)).toBeGreaterThan(0);
  });

  it('leans with the poke direction and flips when the impulse flips', () => {
    const back = pokeBodyReaction({ t: 0.2, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1, softChest: false, twist: 0 });
    const forward = pokeBodyReaction({ t: 0.2, zone: 'torso', fallX: 0, fallZ: 1, sideSign: 1, softChest: false, twist: 0 });
    expect(back.spinePitch).toBeLessThan(0);
    expect(forward.spinePitch).toBeGreaterThan(0);
    expect(back.headX).toBeLessThan(0);
    expect(forward.headX).toBeGreaterThan(0);
    const left = pokeBodyReaction({ t: 0.2, zone: 'side', fallX: -1, fallZ: 0, sideSign: -1, softChest: false, twist: 0 });
    const right = pokeBodyReaction({ t: 0.2, zone: 'side', fallX: 1, fallZ: 0, sideSign: 1, softChest: false, twist: 0 });
    expect(left.chestRoll).toBeGreaterThan(0);
    expect(right.chestRoll).toBeLessThan(0);
    const headLeft = pokeBodyReaction({ t: 0.2, zone: 'head', fallX: -1, fallZ: 0, sideSign: -1, softChest: false, twist: 0 });
    expect(headLeft.spinePitch).toBe(0);
    expect(headLeft.headZ).not.toBe(0);
    expect(headLeft.lArmX).toBe(0);
  });

  it('leans the chest toward a side impulse without moving the root', () => {
    const side = pokeBodyReaction({ t: 0.2, zone: 'side', fallX: 1, fallZ: 0, sideSign: 1, softChest: false, twist: 0.1 });
    expect(side.chestRoll).not.toBe(0);
    expect(Math.abs(side.rArmX)).toBeGreaterThan(Math.abs(side.lArmX));
  });

  it('hits like a punch: big at impact, a rebound, then small, and never inverts', () => {
    expect(pokePunch(0.1, 'body')).toBeGreaterThan(0.7);
    expect(pokePunch(0.55, 'body')).toBeLessThan(0);
    expect(Math.abs(pokePunch(1, 'body'))).toBeLessThan(0.12);
    const impact = pokeBodyReaction({ t: 0.1, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1, softChest: false, twist: 0, direction: 'front' });
    expect(impact.spinePitch).toBeLessThan(-0.45);
    expect(Math.abs(impact.hipPitch)).toBeGreaterThan(0.25);
    expect(impact.hipShiftZ).not.toBe(0);
    const recover = pokeBodyReaction({ t: 0.55, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1, softChest: false, twist: 0, direction: 'front' });
    expect(recover.spinePitch).toBeGreaterThan(0);
    const settle = pokeBodyReaction({ t: 1, zone: 'torso', fallX: 0, fallZ: -1, sideSign: 1, softChest: false, twist: 0, direction: 'front' });
    expect(Math.abs(settle.spinePitch)).toBeLessThan(Math.abs(impact.spinePitch) * 0.25);

    const angles = ['spinePitch', 'chestPitch', 'spineYaw', 'chestRoll', 'headX', 'headZ', 'hipPitch', 'hipRoll', 'lArmX', 'rArmX', 'lElbowZ', 'rElbowZ', 'lArmUp', 'rArmUp'] as const;
    for (const zone of zones) {
      for (const t of [0.08, 0.2, 0.45, 0.7, 1]) {
        const hit = pokeBodyReaction({ t, zone, fallX: 0.4, fallZ: -0.9, sideSign: -1, softChest: true, twist: 0.12, direction: 'left' });
        for (const key of angles) expect(Math.abs(hit[key])).toBeLessThan(1.2);
        expect(Math.abs(hit.hipShiftX)).toBeLessThanOrEqual(0.055);
        expect(Math.abs(hit.hipShiftZ)).toBeLessThanOrEqual(0.055);
      }
    }
  });

  it('keeps a head poke on the head and gives arms and legs their own shape', () => {
    const head = pokeBodyReaction({ t: 0.1, zone: 'head', fallX: 0.2, fallZ: -1, sideSign: 1, softChest: false, twist: 0, direction: 'front' });
    expect(head.spinePitch).toBe(0);
    expect(head.hipPitch).toBe(0);
    expect(head.lArmX).toBe(0);
    expect(Math.abs(head.headX)).toBeGreaterThan(0.5);

    const leftArm = pokeBodyReaction({ t: 0.12, zone: 'armL', fallX: -0.2, fallZ: -1, sideSign: -1, softChest: false, twist: 0, direction: 'front' });
    const rightArm = pokeBodyReaction({ t: 0.12, zone: 'armR', fallX: 0.2, fallZ: -1, sideSign: 1, softChest: false, twist: 0, direction: 'front' });
    expect(Math.abs(leftArm.lArmX)).toBeGreaterThan(Math.abs(leftArm.rArmX));
    expect(Math.abs(rightArm.rArmX)).toBeGreaterThan(Math.abs(rightArm.lArmX));
    expect(Math.abs(leftArm.lElbowZ)).not.toBeCloseTo(Math.abs(rightArm.rElbowZ), 2);

    const leg = pokeBodyReaction({ t: 0.12, zone: 'legL', fallX: -0.3, fallZ: -0.9, sideSign: -1, softChest: false, twist: 0, direction: 'front' });
    expect(Math.abs(leg.hipPitch)).toBeGreaterThan(Math.abs(leg.chestPitch));
    expect(leg.rootY).toBe(0);

    const front = pokeBodyReaction({ t: 0.12, zone: 'chest', fallX: 0, fallZ: -1, sideSign: 1, softChest: true, twist: 0, direction: 'front' });
    const side = pokeBodyReaction({ t: 0.12, zone: 'chest', fallX: 1, fallZ: 0, sideSign: 1, softChest: true, twist: 0, direction: 'right' });
    expect(Math.abs(front.chestPitch)).toBeGreaterThan(Math.abs(side.chestPitch));
    expect(Math.abs(side.chestRoll)).toBeGreaterThan(Math.abs(front.chestRoll));
  });
});
