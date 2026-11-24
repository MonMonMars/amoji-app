/**
 * The free MP3 tier plays the ORIGINAL TTS audio.
 *
 * Owner report (2026-11-23): "all the modified sound not sound good ... please
 * only use the original TTS." The old gtts-timbre.ts produced a per-character
 * playbackRate (0.38…1.72) with preservesPitch=false, which resampled the one
 * female Google speaker into "male"/"bright"/"deep" personas. That is gone.
 *
 * This file now pins the identity contract so a future agent cannot quietly
 * restore a pitch band: every argument combination must return exactly 1.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ORIGINAL_TTS_PITCH_BIAS,
  gttsCharacterPitchBias,
  type GttsPitchTier,
} from '../lib/gtts-timbre';
import { CHARACTERS_WANT } from '../lib/characters-want';

const IDS = CHARACTERS_WANT.map((c) => c.id);
const TIERS: GttsPitchTier[] = ['deep', 'mid', 'bright'];

describe('original-TTS identity mapping', () => {
  it('returns 1 with no arguments', () => {
    expect(gttsCharacterPitchBias()).toBe(1);
    expect(ORIGINAL_TTS_PITCH_BIAS).toBe(1);
  });

  it('returns 1 for every gender, character, language and pinned tier', () => {
    for (const gender of ['female', 'male'] as const) {
      for (const id of [...IDS, 'unknown-character']) {
        for (const lang of ['yue', 'zh', 'ja', 'en'] as const) {
          for (const tier of TIERS) {
            expect(
              gttsCharacterPitchBias(gender, id, lang, tier),
              `${gender}/${id}/${lang}/${tier}`,
            ).toBe(1);
          }
        }
      }
    }
  });

  it('is stable (greeting and chat resolve the same number)', () => {
    expect(gttsCharacterPitchBias('female', 'a01-shino')).toBe(
      gttsCharacterPitchBias('female', 'a01-shino'),
    );
  });

  it('keeps no gender/tier bands in the module', () => {
    const src = readFileSync(join(__dirname, '../lib/gtts-timbre.ts'), 'utf8');
    expect(src).not.toMatch(/PITCH_BIAS_MALE|PITCH_BIAS_FEMALE/);
    expect(src).not.toMatch(/FEMALE_TIER_OFFSET|MALE_TIER_OFFSET/);
    expect(src).not.toMatch(/characterPitchUnit|CHAR_PITCH_SPREAD/);
    expect(src).not.toMatch(/\.preservesPitch\s*=/);
  });

  it('voice.ts keeps ONE shared resolver, which is now the identity', () => {
    const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain("import { gttsCharacterPitchBias } from './gtts-timbre'");
    expect(voice).toMatch(/export function gttsPitchBias\(/);
    expect(voice).toMatch(/return gttsCharacterPitchBias\(gender, characterId, lang(?:, tier)?\)/);
  });
});
