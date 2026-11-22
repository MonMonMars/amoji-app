/**
 * Guards Owner R13 same-side poke lean on tiered section reactions.
 * #409/#434/#471: poke the left side -> body tips screen-left.
 * #554 flipped this to "recoil away" (push left -> tips right) and the owner
 * rejected it again. These tests fail if that inversion comes back.
 */
import { describe, expect, it } from 'vitest';
import { lateralFallTowardScreenSide, pokeBodyReaction } from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';

const CAM_RIGHT = { x: 1, z: 0 };

function blendedOffCenterFall(leanSide: number, impulse = { x: 0.35, z: -0.72 }) {
  const fall = lateralFallTowardScreenSide(CAM_RIGHT, leanSide);
  const x = impulse.x * 0.7 + fall.x * 0.55;
  const z = impulse.z * 0.85 + fall.z * 0.3;
  const len = Math.hypot(x, z) || 1;
  return { fallX: x / len, fallZ: z / len };
}

describe('poke body lean (same-side, section path)', () => {
  it('lateralFallTowardScreenSide tips with the push, not away (#554 guard)', () => {
    const left = lateralFallTowardScreenSide(CAM_RIGHT, -1);
    const right = lateralFallTowardScreenSide(CAM_RIGHT, 1);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
  });

  it('left finger push yields -fallX on blended chest path (CompanionCanvas)', () => {
    const { fallX } = blendedOffCenterFall(-1);
    expect(fallX).toBeLessThan(-0.35);
  });

  it('blended chest reaction rolls toward screen-left on a left push', () => {
    const { fallX, fallZ } = blendedOffCenterFall(-1);
    const hit = pokeSectionBodyReaction({
      t: 0.12,
      section: resolvePokeSection('chest', 'left'),
      hitZone: 'chest',
      fallX,
      fallZ,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    expect(hit.chestRoll).toBeGreaterThan(0.15);
    expect(hit.headZ).toBeGreaterThan(0.01);
  });

  it('pure side tap with same-side fall swings the near arm harder', () => {
    const fall = lateralFallTowardScreenSide(CAM_RIGHT, -1);
    const hit = pokeBodyReaction({
      t: 0.12,
      zone: 'side',
      fallX: fall.x,
      fallZ: fall.z,
      sideSign: 1,
      softChest: false,
      twist: 0,
      direction: 'left',
    });
    expect(hit.chestRoll).toBeGreaterThan(0.35);
    expect(Math.abs(hit.rArmX)).toBeGreaterThan(Math.abs(hit.lArmX));
  });
});
