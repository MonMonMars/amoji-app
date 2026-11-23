/**
 * Gender truth for the free voice tier (owner report 2026-11-23):
 * "all the male voice in all language are female voice instead."
 *
 * The cause was not a routing bug: Google Translate `translate_tts` has ONE
 * fixed speaker per `tl`, and every shipped `tl` is female. The old catalog
 * still declared male variants of those same `tl` codes and played them with
 * preservesPitch=false + playbackRate 0.64, i.e. a pitched-down woman wearing
 * a "male" label.
 *
 * These tests are the ones that would have caught it:
 *   1. every pickable gTTS button is labelled with its ACTUAL source gender;
 *   2. no male-labelled gTTS choice exists in shipping or Add data;
 *   3. no engine-catalog row claims a gender that its voice name contradicts;
 *   4. a legacy male pin resolves to the truthful female speaker, not a
 *      male-labelled one.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VOICE_CATALOG,
  browserVoiceGender,
  isFemaleNeuralVoice,
  isMaleNeuralVoice,
  type VoiceGender,
} from '../lib/voice-catalog';
import {
  ALL_LOCALES,
  VOICE_CHOICES,
  gttsSpeakerGender,
  voiceChoicesFor,
  voiceChoiceById,
} from '../lib/voice-capability';
import { VOICE_ADD_POOL, extraVoiceId, resetVoiceExtras } from '../lib/voice-extras';
import { selectTtsButtons } from '../lib/tts-button-registry';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';

const here = path.dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  resetVoicePicks();
  resetVoiceExtras();
});

describe('gTTS picker cards tell the truth about gender', () => {
  it('labels every shipping choice with the source speaker gender (female)', () => {
    for (const choice of VOICE_CHOICES) {
      expect(choice.deliveryGender, `${choice.locale} ${choice.tl}`).toBe(
        gttsSpeakerGender(choice.tl),
      );
      expect(choice.deliveryGender).toBe('female');
    }
  });

  it('ships no male-labelled gTTS button in any locale', () => {
    for (const locale of ALL_LOCALES) {
      const male = selectTtsButtons(locale).filter((b) => b.deliveryGender === 'male');
      expect(male, `${locale} male buttons`).toEqual([]);
      expect(selectTtsButtons(locale).length, locale).toBeGreaterThan(0);
    }
  });

  it('has no male entry in the Add pool and no male extra id', () => {
    for (const candidate of VOICE_ADD_POOL) {
      expect(candidate.deliveryGender, `${candidate.locale} ${candidate.tl}`).toBe('female');
      const id = extraVoiceId(candidate.tl, candidate.deliveryGender);
      expect(id).toMatch(/:f:mid$/);
    }
  });

  it('resolves a legacy male pin to the truthful female speaker', () => {
    for (const locale of ALL_LOCALES) {
      const tl = voiceChoicesFor(locale)[0]!.tl;
      saveVoicePick(locale, `gtts:${tl}:m:mid`);
      const pinned = voicePickFor(locale);
      expect(pinned, locale).toBe(`gtts:${tl}:f:mid`);
      expect(voiceChoiceById(pinned)?.deliveryGender, locale).toBe('female');
    }
  });

  it('never introduces pitch processing to fake a gender', () => {
    const gtts = fs.readFileSync(path.resolve(here, '../lib/gtts.ts'), 'utf8');
    // Comments may mention the retired mechanism; code must not assign it.
    expect(gtts).not.toMatch(/\.preservesPitch\s*=/);
    expect(gtts).not.toMatch(/webkitPreservesPitch\s*=/);
    expect(gtts).not.toMatch(/playbackRate\s*=\s*[^;]*(pitch|bias)/i);
  });
});

describe('engine catalog rows agree with their source voice names', () => {
  const CHECKED: VoiceGender[] = ['female', 'male'];

  function assertNameGender(locale: string, engine: string, id: string, gender: VoiceGender) {
    if (engine === 'edge') {
      const male = isMaleNeuralVoice(id);
      const female = isFemaleNeuralVoice(id);
      // Only enforce when the name is classified at all.
      if (!male && !female) return;
      expect(male, `${locale} edge ${id} labelled ${gender}`).toBe(gender === 'male');
      expect(female, `${locale} edge ${id} labelled ${gender}`).toBe(gender === 'female');
      return;
    }
    if (engine === 'speech') {
      const heard = browserVoiceGender(id);
      if (heard === null) return; // e.g. 粤語 — no personal name to read
      expect(heard, `${locale} speech ${id} labelled ${gender}`).toBe(gender);
    }
  }

  it('has no shipping row whose name reads as the opposite gender', () => {
    for (const row of VOICE_CATALOG.filter((v) => v.shipping)) {
      expect(CHECKED).toContain(row.gender);
      assertNameGender(row.locale, row.engine, row.id, row.gender);
    }
  });
});
