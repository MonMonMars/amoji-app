/**
 * Guards owner same-side poke lean on tiered section reactions (#434 / #471).
 * #443 briefly flipped fall to opposite-of-push; these fail if that returns.
 */
import { describe, expect, it } from 'vitest';
import { lateralFallAwayFromScreenSide, pokeBodyReaction } from '../lib/poke-hit';
import { pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';

const CAM_RIGHT = { x: 1, z: 0 };

function blendedOffCenterFall(leanSide: number, impulse = { x: 0.35, z: -0.72 }) {
  const fall = lateralFallAwayFromScreenSide(CAM_RIGHT, leanSide);
  const x = impulse.x * 0.42 + fall.x * 0.95;
  const z = impulse.z * 0.55 + fall.z * 0.4;
  const len = Math.hypot(x, z) || 1;
  return { fallX: x / len, fallZ: z / len };
}

describe('poke body lean (same-side, section path)', () => {
  it('lateralFallAwayFromScreenSide tips toward push, not recoil away (#443 guard)', () => {
    const left = lateralFallAwayFromScreenSide(CAM_RIGHT, -1);
    const right = lateralFallAwayFromScreenSide(CAM_RIGHT, 1);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
  });

  it('left finger push yields −fallX on blended chest path (CompanionCanvas)', () => {
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
    expect(hit.headZ).toBeGreaterThan(0.03);
  });

  it('pure side tap with same-side fall swings the near arm harder', () => {
    const fall = lateralFallAwayFromScreenSide(CAM_RIGHT, -1);
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