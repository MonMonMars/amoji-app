/**
 * Guards recoil-away poke lean on tiered section reactions.
 * The poked part recedes away from the finger (push left → fall right).
 */
import { describe, expect, it } from 'vitest';
import { lateralFallRecoilFromScreenSide, pokeBodyReaction } from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';

const CAM_RIGHT = { x: 1, z: 0 };

function blendedOffCenterFall(leanSide: number, impulse = { x: 0.35, z: -0.72 }) {
  const fall = lateralFallRecoilFromScreenSide(CAM_RIGHT, leanSide);
  const x = impulse.x * 0.7 + fall.x * 0.55;
  const z = impulse.z * 0.85 + fall.z * 0.3;
  const len = Math.hypot(x, z) || 1;
  return { fallX: x / len, fallZ: z / len };
}

describe('poke body lean (recoil away, section path)', () => {
  it('lateralFallRecoilFromScreenSide tips away from the push', () => {
    const left = lateralFallRecoilFromScreenSide(CAM_RIGHT, -1);
    const right = lateralFallRecoilFromScreenSide(CAM_RIGHT, 1);
    expect(left.x).toBeGreaterThan(0);
    expect(right.x).toBeLessThan(0);
  });

  it('left finger push yields +fallX on blended chest path (CompanionCanvas)', () => {
    const { fallX } = blendedOffCenterFall(-1);
    expect(fallX).toBeGreaterThan(0.2);
  });

  it('blended chest reaction rolls toward screen-right on a left push', () => {
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
    expect(hit.chestRoll).toBeLessThan(-0.1);
    expect(hit.headZ).toBeLessThan(-0.02);
  });

  it('pure side tap with recoil-away fall swings the near arm harder', () => {
    const fall = lateralFallRecoilFromScreenSide(CAM_RIGHT, -1);
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
    expect(hit.chestRoll).toBeLessThan(-0.35);
    expect(Math.abs(hit.rArmX)).toBeGreaterThan(Math.abs(hit.lArmX));
  });
});