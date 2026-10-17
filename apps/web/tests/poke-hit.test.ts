import { describe, expect, it } from 'vitest';
import { classifyPoke } from '../lib/poke-hit';

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
