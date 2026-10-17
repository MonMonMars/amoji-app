import { describe, expect, it } from 'vitest';
import { classifyPoke, pokeBodyReaction } from '../lib/poke-hit';

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
});
