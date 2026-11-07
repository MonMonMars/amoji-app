import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PITCH_BIAS_FEMALE, PITCH_BIAS_MALE } from '../lib/gtts';
import {
  CHAR_PITCH_SPREAD,
  characterPitchUnit,
  gttsCharacterPitchBias,
  pitchesDiffer,
} from '../lib/gtts-timbre';

const FEMALE_IDS = ['a01', 'a02', 'a03', 'a10', 'a20'];
const MALE_IDS = ['a30', 'a31', 'a40'];

describe('free-chain character pitch fingerprint', () => {
  it('keeps male deeper than female even with jitter', () => {
    const male = gttsCharacterPitchBias('male', 'a30');
    const female = gttsCharacterPitchBias('female', 'a01');
    expect(male).toBeLessThan(1);
    expect(female).toBeGreaterThanOrEqual(0.99);
    expect(male).toBeLessThan(female);
  });

  it('spreads same-gender companions so they are not identical', () => {
    const a = gttsCharacterPitchBias('female', 'a01');
    const b = gttsCharacterPitchBias('female', 'a02');
    const c = gttsCharacterPitchBias('female', 'a03');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(pitchesDiffer({ gender: 'female', id: 'a01' }, { gender: 'female', id: 'a02' })).toBe(true);
    for (const id of FEMALE_IDS) {
      expect(Math.abs(gttsCharacterPitchBias('female', id) - PITCH_BIAS_FEMALE)).toBeLessThanOrEqual(
        CHAR_PITCH_SPREAD + 1e-9,
      );
    }
    for (const id of MALE_IDS) {
      expect(Math.abs(gttsCharacterPitchBias('male', id) - PITCH_BIAS_MALE)).toBeLessThanOrEqual(
        CHAR_PITCH_SPREAD + 1e-9,
      );
    }
  });

  it('is stable for a given id (select greeting and chat must match)', () => {
    expect(characterPitchUnit('a01')).toBe(characterPitchUnit('a01'));
    expect(gttsCharacterPitchBias('female', 'a01')).toBe(gttsCharacterPitchBias('female', 'a01'));
  });

  it('falls back to the gender base when no character id is given', () => {
    expect(gttsCharacterPitchBias('male')).toBe(PITCH_BIAS_MALE);
    expect(gttsCharacterPitchBias('female')).toBe(PITCH_BIAS_FEMALE);
  });

  it('stays inside the gtts playbackRate-safe clamp', () => {
    for (const id of [...FEMALE_IDS, ...MALE_IDS]) {
      const f = gttsCharacterPitchBias('female', id);
      const m = gttsCharacterPitchBias('male', id);
      expect(f).toBeGreaterThanOrEqual(0.82);
      expect(f).toBeLessThanOrEqual(1.2);
      expect(m).toBeGreaterThanOrEqual(0.82);
      expect(m).toBeLessThanOrEqual(1.2);
    }
  });

  it('voice.ts re-exports the same helper so every speak path stays in sync', () => {
    const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain("import { gttsCharacterPitchBias } from './gtts-timbre'");
    expect(voice).toMatch(/export function gttsPitchBias\(gender: 'female' \| 'male', characterId\?: string\)/);
    expect(voice).toContain('return gttsCharacterPitchBias(gender, characterId)');
  });
});