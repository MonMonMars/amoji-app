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
  it('defines 48 sections (6 tiers × 8 angles)', () => {
    expect(POKE_TIER_ORDER.length).toBe(6);
    expect(POKE_ANGLES.length).toBe(8);
    expect(POKE_SECTIONS.length).toBe(48);
    expect(POKE_SECTION_IDS.length).toBe(48);
    expect(new Set(POKE_SECTION_IDS).size).toBe(48);
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
  it('tier 6 (calf + foot) now recoils (hips carry the poke, feet planted)', () => {
    const section = resolvePokeSection('foot', 'front');
    expect(section.voiceOnly).toBe(false);
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
    expect(Math.abs(hit.hipPitch)).toBeGreaterThan(0.02);
    expect(Math.abs(hit.hipPitch)).toBeGreaterThan(Math.abs(hit.spinePitch) * 0.6);
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

  it('left-origin poke leans left with chest roll + poked-side arm', () => {
    const section = resolvePokeSection('side', 'left');
    const hit = pokeSectionBodyReaction({
      t: 0.12,
      section,
      hitZone: 'side',
      // Same-side lean for a left poke: fall -X face-on -> tip screen-left.
      fallX: -1,
      fallZ: 0,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    expect(hit.chestRoll).toBeGreaterThan(0.35);
    expect(Math.abs(hit.rArmX)).toBeGreaterThan(Math.abs(hit.lArmX));
    expect(Math.abs(hit.rArmX)).toBeGreaterThan(0.45);
  });

  it('CompanionCanvas encodes same-side poke lean + layout-local coords', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toMatch(/tips screen-left/);
    expect(canvas).toMatch(/screenPointerSideSign\s*\(/);
    expect(canvas).toMatch(/lateralFallTowardScreenSide\s*\(/);
    expect(canvas).not.toMatch(/lateralFallRecoilFromScreenSide/);
    expect(canvas).toMatch(/directionFromAxes/);
    expect(canvas).toMatch(/clientPointInElementLocal\s*\(/);
    expect(canvas).toMatch(/ndcPointInElementLocal\s*\(/);
    expect(canvas).toMatch(/orientationchange/);
    expect(canvas).toMatch(/fingerOffCenter/);
    expect(canvas).toMatch(/Kill stuck poke lean/);
    expect(canvas).toMatch(/pokeArmSideFromScreenPush\s*\(\s*leanSide\s*\)/);
  });

  it('off-center chest poke leans with a left push', () => {
    const section = resolvePokeSection('chest', 'left');
    // Blended canvas fall for a finger-left push: mostly -X, slightly back.
    const hit = pokeSectionBodyReaction({
      t: 0.12,
      section,
      hitZone: 'chest',
      fallX: -0.9,
      fallZ: -0.35,
      sideSign: 1,
      softChest: false,
      twist: 0,
    });
    expect(hit.chestRoll).toBeGreaterThan(0.2);
    expect(Math.abs(hit.rArmX)).toBeGreaterThan(Math.abs(hit.lArmX));
  });
});
