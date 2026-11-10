import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  POKE_ANGLES,
  POKE_SECTION_IDS,
  POKE_SECTIONS,
  POKE_TIER_ORDER,
  pokeSectionBodyReaction,
  pokeSectionById,
  resolvePokeSection,
  talkZoneToTier,
} from '../lib/poke-zones';

const root = path.resolve(import.meta.dirname, '..');

describe('poke-zones grid', () => {
  it('defines 24 sections (6 tiers × 4 angles)', () => {
    expect(POKE_TIER_ORDER.length).toBe(6);
    expect(POKE_ANGLES.length).toBe(4);
    expect(POKE_SECTIONS.length).toBe(24);
    expect(POKE_SECTION_IDS.length).toBe(24);
    expect(new Set(POKE_SECTION_IDS).size).toBe(24);
  });

  it('uses poke:tier:angle voice keys', () => {
    for (const s of POKE_SECTIONS) {
      expect(s.id).toBe(`poke:${s.tier}:${s.angle}`);
      expect(s.voiceKey).toBe(s.id);
      expect(pokeSectionById(s.id)?.tier).toBe(s.tier);
    }
  });

  it('resolves hit zones into tiers', () => {
    expect(talkZoneToTier('head')).toBe('head');
    expect(talkZoneToTier('chest')).toBe('shoulder_chest');
    expect(talkZoneToTier('armL')).toBe('shoulder_chest');
    expect(talkZoneToTier('belly')).toBe('belly');
    expect(talkZoneToTier('butt')).toBe('hip');
    expect(talkZoneToTier('legR')).toBe('thigh');
    expect(talkZoneToTier('foot')).toBe('calf_foot');
  });

  it('resolvePokeSection pairs tier with classifier direction', () => {
    const s = resolvePokeSection('chest', 'right');
    expect(s.id).toBe('poke:shoulder_chest:right');
    expect(s.tierNumber).toBe(2);
  });
});

describe('pokeSectionBodyReaction', () => {
  it('tier 6 (calf + foot) has zero body motion', () => {
    const section = resolvePokeSection('foot', 'front');
    expect(section.voiceOnly).toBe(true);
    const hit = pokeSectionBodyReaction({
      t: 0.15,
      section,
      hitZone: 'foot',
      fallX: 0.3,
      fallZ: -0.95,
      sideSign: 1,
      softChest: false,
      twist: 0.05,
    });
    const sum =
      Math.abs(hit.headX) + Math.abs(hit.headZ)
      + Math.abs(hit.spinePitch) + Math.abs(hit.chestPitch)
      + Math.abs(hit.hipPitch) + Math.abs(hit.lArmX) + Math.abs(hit.rArmX);
    expect(sum).toBe(0);
    expect(hit.hipShiftX).toBe(0);
    expect(hit.hipShiftZ).toBe(0);
  });

  it('head tier moves head more than spine at impact (upper body follows less)', () => {
    const section = resolvePokeSection('head', 'front');
    const hit = pokeSectionBodyReaction({
      t: 0.12,
      section,
      hitZone: 'head',
      fallX: 0,
      fallZ: -1,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    expect(Math.abs(hit.headX)).toBeGreaterThan(0.4);
    // Pixel: head poke still takes the torso with a soft falloff — not head-only.
    expect(Math.abs(hit.spinePitch)).toBeGreaterThan(0);
    expect(Math.abs(hit.headX)).toBeGreaterThan(Math.abs(hit.spinePitch));
    expect(Math.abs(hit.spinePitch)).toBeLessThan(0.2);
  });

  it('left lateral poke leans right (opposite-side) with chest roll', () => {
    const section = resolvePokeSection('side', 'left');
    const hit = pokeSectionBodyReaction({
      t: 0.12,
      section,
      hitZone: 'side',
      // Canvas lateral path: fall = cameraRight * (-camSide); left poke → +X.
      fallX: 1,
      fallZ: 0,
      sideSign: -1,
      softChest: false,
      twist: 0,
    });
    expect(hit.chestRoll).toBeLessThan(0);
    expect(Math.abs(hit.lArmX)).toBeGreaterThan(Math.abs(hit.rArmX));
  });

  it('CompanionCanvas lateral fall uses -camSide (opposite-side lean)', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toMatch(/multiplyScalar\(\s*-camSide\s*\)/);
    expect(canvas).not.toMatch(/multiplyScalar\(\s*camSide\s*\)/);
  });
});
