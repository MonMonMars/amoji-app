import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GTTS_PITCH_BIAS_MAX,
  GTTS_PITCH_BIAS_MIN,
  PITCH_BIAS_FEMALE,
  PITCH_BIAS_MALE,
} from '../lib/gtts';
import {
  CHAR_PITCH_SPREAD,
  characterPitchUnit,
  FEMALE_TIER_OFFSET,
  GTTS_MALE_BIAS_JA,
  gttsCharacterPitchBias,
  gttsPitchTierFor,
  MALE_TIER_OFFSET,
  pitchesDiffer,
  type GttsPitchTier,
} from '../lib/gtts-timbre';
import { CHARACTERS_WANT } from '../lib/characters-want';

const FEMALE_IDS = CHARACTERS_WANT.filter((c) => c.gender === 'female').map((c) => c.id);
const MALE_IDS = CHARACTERS_WANT.filter((c) => c.gender === 'male').map((c) => c.id);

describe('free-chain character pitch fingerprint', () => {
  it('keeps male deeper than female even with tiers', () => {
    const male = Math.max(...MALE_IDS.map((id) => gttsCharacterPitchBias('male', id)));
    const female = Math.min(...FEMALE_IDS.map((id) => gttsCharacterPitchBias('female', id)));
    expect(male).toBeLessThan(1);
    // Deep female can sit near ~0.94 with the widened tier offsets.
    expect(female).toBeGreaterThan(0.9);
    expect(male).toBeLessThan(female);
  });

  it('assigns curated bright / mid / deep tiers across the cast', () => {
    const femaleTiers = new Set(FEMALE_IDS.map((id) => gttsPitchTierFor(id)));
    const maleTiers = new Set(MALE_IDS.map((id) => gttsPitchTierFor(id)));
    expect(femaleTiers).toEqual(new Set<GttsPitchTier>(['deep', 'mid', 'bright']));
    expect(maleTiers).toEqual(new Set<GttsPitchTier>(['deep', 'mid', 'bright']));

    const a = gttsCharacterPitchBias('female', 'a01-shino');
    const b = gttsCharacterPitchBias('female', 'a02-shibu');
    expect(a).not.toBe(b);
    expect(pitchesDiffer({ gender: 'female', id: 'a01-shino' }, { gender: 'female', id: 'a02-shibu' })).toBe(true);
  });

  it('spreads same-gender companions farther than micro-jitter alone', () => {
    const biases = FEMALE_IDS.map((id) => gttsCharacterPitchBias('female', id));
    const span = Math.max(...biases) - Math.min(...biases);
    // Tier offsets (±~0.05–0.08) must beat the old ±0.045 hash-only band.
    expect(span).toBeGreaterThan(CHAR_PITCH_SPREAD * 2 + 0.05);
    const clampBias = (v: number) =>
      Math.min(GTTS_PITCH_BIAS_MAX, Math.max(GTTS_PITCH_BIAS_MIN, v));
    for (const id of FEMALE_IDS) {
      const tier = gttsPitchTierFor(id);
      const expectedBase = clampBias(PITCH_BIAS_FEMALE + FEMALE_TIER_OFFSET[tier]);
      expect(Math.abs(gttsCharacterPitchBias('female', id) - expectedBase)).toBeLessThanOrEqual(
        CHAR_PITCH_SPREAD + 1e-9,
      );
    }
    for (const id of MALE_IDS) {
      const tier = gttsPitchTierFor(id);
      const expectedBase = clampBias(PITCH_BIAS_MALE + MALE_TIER_OFFSET[tier]);
      expect(Math.abs(gttsCharacterPitchBias('male', id) - expectedBase)).toBeLessThanOrEqual(
        CHAR_PITCH_SPREAD + 1e-9,
      );
    }
  });

  it('is stable for a given id (select greeting and chat must match)', () => {
    expect(characterPitchUnit('a01-shino')).toBe(characterPitchUnit('a01-shino'));
    expect(gttsCharacterPitchBias('female', 'a01-shino')).toBe(gttsCharacterPitchBias('female', 'a01-shino'));
    expect(gttsPitchTierFor('a01-shino')).toBe(gttsPitchTierFor('a01-shino'));
  });

  it('falls back to the gender base when no character id is given', () => {
    expect(gttsCharacterPitchBias('male')).toBe(PITCH_BIAS_MALE);
    expect(gttsCharacterPitchBias('female')).toBe(PITCH_BIAS_FEMALE);
  });

  it('lowers ja male base pitch so male/female delivery are audibly distinct', () => {
    const jaMale = gttsCharacterPitchBias('male', 'a03-fumiriya', 'ja');
    const jaFemale = gttsCharacterPitchBias('female', 'a01-shino', 'ja');
    expect(GTTS_MALE_BIAS_JA).toBeLessThan(PITCH_BIAS_MALE);
    expect(jaMale).toBeLessThan(jaFemale);
    expect(jaMale).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
  });

  it('stays inside the gtts playbackRate-safe clamp', () => {
    for (const id of [...FEMALE_IDS, ...MALE_IDS]) {
      const f = gttsCharacterPitchBias('female', id);
      const m = gttsCharacterPitchBias('male', id);
      expect(f).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
      expect(f).toBeLessThanOrEqual(GTTS_PITCH_BIAS_MAX);
      expect(m).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
      expect(m).toBeLessThanOrEqual(GTTS_PITCH_BIAS_MAX);
    }
  });

  it('makes selectable deep vs bright obviously different (owner #400 follow-up)', () => {
    const deepF = gttsCharacterPitchBias('female', undefined, 'en', 'deep');
    const brightF = gttsCharacterPitchBias('female', undefined, 'en', 'bright');
    const deepM = gttsCharacterPitchBias('male', undefined, 'en', 'deep');
    const brightM = gttsCharacterPitchBias('male', undefined, 'en', 'bright');
    // After #406/#410 owner still heard similar — require a larger audible gap.
    expect(brightF - deepF).toBeGreaterThanOrEqual(0.40);
    expect(brightM - deepM).toBeGreaterThanOrEqual(0.30);
    expect(deepM).toBeLessThan(deepF);
    expect(FEMALE_TIER_OFFSET.bright - FEMALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.40);
    expect(MALE_TIER_OFFSET.bright - MALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.36);
  });

  it('voice.ts re-exports the same helper so every speak path stays in sync', () => {
    const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain("import { gttsCharacterPitchBias } from './gtts-timbre'");
    expect(voice).toMatch(/export function gttsPitchBias\(/);
    expect(voice).toMatch(/gttsCharacterPitchBias\(gender, characterId, lang(?:, tier)?\)/);
  });
});
