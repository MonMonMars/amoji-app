import { describe, expect, it } from 'vitest';
import {
  directionFromAxes,
  inferPokeDirection,
  pokeBodyReaction,
  type PokeDirection,
  type TalkZone,
} from '../lib/poke-hit';
import { POKE_ANGLES, pokeSectionBodyReaction, resolvePokeSection } from '../lib/poke-zones';
import { recordedPokeClip } from '../lib/voice-clips';

const FORWARD = { x: 0, z: -1 };
const RIGHT = { x: 1, z: 0 };

const ZONES: TalkZone[] = [
  'head', 'torso', 'chest', 'side', 'back', 'armL', 'armR',
  'belly', 'butt', 'hand', 'legL', 'legR', 'foot',
];

describe('8-way poke direction', () => {
  it('exposes eight facing angles', () => {
    expect(POKE_ANGLES).toEqual([
      'front', 'frontLeft', 'left', 'backLeft',
      'back', 'backRight', 'right', 'frontRight',
    ]);
  });

    it('classifies octants in the character frame (face −Z)', () => {
    const worldImpulse: Array<[{ x: number; z: number }, PokeDirection]> = [
      [{ x: 0, z: 1 }, 'front'],
      [{ x: 0.7, z: 0.7 }, 'frontLeft'],
      [{ x: 1, z: 0 }, 'left'],
      [{ x: 0.7, z: -0.7 }, 'backLeft'],
      [{ x: 0, z: -1 }, 'back'],
      [{ x: -0.7, z: -0.7 }, 'backRight'],
      [{ x: -1, z: 0 }, 'right'],
      [{ x: -0.7, z: 0.7 }, 'frontRight'],
    ];
    for (const [impulse, want] of worldImpulse) {
      expect(directionFromAxes(impulse, FORWARD, RIGHT)).toBe(want);
    }
  });

  it('infers octants from body-reaction fall (front = −Z recoil)', () => {
    const falls: Array<[{ x: number; z: number }, PokeDirection]> = [
      [{ x: 0, z: -1 }, 'front'],
      [{ x: 0.7, z: -0.7 }, 'frontLeft'],
      [{ x: 1, z: 0 }, 'left'],
      [{ x: 0.7, z: 0.7 }, 'backLeft'],
      [{ x: 0, z: 1 }, 'back'],
      [{ x: -0.7, z: 0.7 }, 'backRight'],
      [{ x: -1, z: 0 }, 'right'],
      [{ x: -0.7, z: -0.7 }, 'frontRight'],
    ];
    for (const [fall, want] of falls) {
      expect(inferPokeDirection(fall.x, fall.z)).toBe(want);
    }
  });
});

describe('full-body poke motion + gendered voice', () => {
  it('every talk zone has a non-still reaction', () => {
    for (const zone of ZONES) {
      const hit = pokeSectionBodyReaction({
        t: 0.12,
        section: resolvePokeSection(zone, 'front'),
        hitZone: zone,
        fallX: 0,
        fallZ: -1,
        sideSign: 1,
        softChest: false,
        twist: 0,
      });
      const sum = Math.abs(hit.headX) + Math.abs(hit.headZ)
        + Math.abs(hit.spinePitch) + Math.abs(hit.chestPitch)
        + Math.abs(hit.hipPitch) + Math.abs(hit.chestRoll);
      expect(sum, zone).toBeGreaterThan(0.02);
    }
  });

  it('head poke tips the head toward the finger (front = +X pitch)', () => {
    const front = pokeBodyReaction({
      t: 0.12, zone: 'head', fallX: 0, fallZ: -1, sideSign: 1,
      softChest: false, twist: 0, direction: 'front',
    });
    // Owner 2026-11-23: a front poke moves her forward, not backward.
    expect(front.headX).toBeGreaterThan(0.4);
    const side = pokeBodyReaction({
      t: 0.12, zone: 'head', fallX: 1, fallZ: 0, sideSign: 1,
      softChest: false, twist: 0, direction: 'left',
    });
    expect(side.headZ).toBeLessThan(-0.3);
  });

  it('girl and boy poke clips exist for every zone and stay gendered', () => {
    for (const zone of ZONES) {
      const girl = recordedPokeClip('female', zone);
      const boy = recordedPokeClip('male', zone);
      expect(girl, zone).toMatch(/\.mp3$/);
      expect(boy, zone).toMatch(/\.mp3$/);
      expect(girl, zone).toMatch(/female/);
      expect(boy, zone).toMatch(/male/);
      expect(girl).not.toBe(boy);
    }
  });
});
