/**
 * Owner follow-up after #395/#400: pitch variants must differ audibly, male
 * pins must resolve male delivery, and TTS must leave the mic communications
 * sink for the same default speakers as the gate sample.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GTTS_PITCH_BIAS_MIN,
  PITCH_BIAS_FEMALE,
  PITCH_BIAS_MALE,
  gttsPlaybackRate,
} from '../lib/gtts';
import {
  FEMALE_TIER_OFFSET,
  MALE_TIER_OFFSET,
  gttsCharacterPitchBias,
} from '../lib/gtts-timbre';
import {
  deliveryGenderForChoice,
  preferredVoiceChoiceForGender,
  tlForChoice,
  voiceChoiceById,
} from '../lib/voice-capability';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';

const web = join(__dirname, '..');

afterEach(() => {
  resetVoicePicks();
});

describe('audible deep vs bright pitch gap', () => {
  it('deep pitchBias is much lower than bright for both genders', () => {
    const deepF = gttsCharacterPitchBias('female', undefined, 'en', 'deep');
    const brightF = gttsCharacterPitchBias('female', undefined, 'en', 'bright');
    const deepM = gttsCharacterPitchBias('male', undefined, 'yue', 'deep');
    const brightM = gttsCharacterPitchBias('male', undefined, 'yue', 'bright');
    expect(brightF - deepF).toBeGreaterThanOrEqual(0.25);
    expect(brightM - deepM).toBeGreaterThanOrEqual(0.2);
    expect(FEMALE_TIER_OFFSET.bright - FEMALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.25);
    expect(MALE_TIER_OFFSET.bright - MALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.2);
  });

  it('male mid stays clearly below female mid', () => {
    expect(PITCH_BIAS_MALE).toBeLessThan(0.9);
    expect(PITCH_BIAS_FEMALE).toBeGreaterThan(1.05);
    expect(PITCH_BIAS_FEMALE - PITCH_BIAS_MALE).toBeGreaterThanOrEqual(0.2);
  });
});

describe('male pin → male voice id / gender / pitch', () => {
  it('male shipping choice ids resolve male deliveryGender and matching tl', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const male = preferredVoiceChoiceForGender(locale, 'male');
      expect(male.deliveryGender).toBe('male');
      expect(male.id).toMatch(/:m:(deep|mid|bright)$/);
      expect(deliveryGenderForChoice(locale, male.id, 'female')).toBe('male');
      expect(tlForChoice(locale, male.id)).toBe(male.tl);
      saveVoicePick(locale, male.id);
      expect(voicePickFor(locale)).toBe(male.id);
      expect(voiceChoiceById(voicePickFor(locale))?.deliveryGender).toBe('male');
    }
  });

  it('male pin pitchBias is in the male band (not female)', () => {
    // No characterId → pure gender mid (no micro-jitter).
    const maleMid = gttsCharacterPitchBias('male', undefined, 'en', 'mid');
    const femaleMid = gttsCharacterPitchBias('female', undefined, 'en', 'mid');
    expect(maleMid).toBe(PITCH_BIAS_MALE);
    expect(femaleMid).toBe(PITCH_BIAS_FEMALE);
    expect(maleMid).toBeLessThan(1);
    expect(gttsPlaybackRate(1, maleMid, 'yue')).toBeLessThan(1);
    expect(gttsPlaybackRate(1, maleMid, 'yue')).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
  });

  it('voice greeting/preview pass delivery gender into Edge and clips', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).toContain('clipFile(lang, delivery, insuranceKind)');
    expect(voice).toContain('gender: delivery');
    expect(voice).toContain('gender: previewGender');
    expect(voice).not.toMatch(/speakEdge\(text, \{\s*lang: locale,\s*gender: 'female'/);
  });
});

describe('non-yue speak path + sink routing', () => {
  it('non-yue preferred male/female picks keep their own tl (not yue)', () => {
    expect(tlForChoice('en', preferredVoiceChoiceForGender('en', 'male').id)).toBe('en-US');
    expect(tlForChoice('zh', preferredVoiceChoiceForGender('zh', 'male').id)).toBe('zh-CN');
    expect(tlForChoice('ja', preferredVoiceChoiceForGender('ja', 'female').id)).toBe('ja');
    expect(tlForChoice('yue', preferredVoiceChoiceForGender('yue', 'male').id)).toBe('yue');
  });

  it('gtts and audio-output force companion playback route before HTMLAudio TTS', () => {
    const gtts = readFileSync(join(web, 'lib/gtts.ts'), 'utf8');
    const audio = readFileSync(join(web, 'lib/audio-output.ts'), 'utf8');
    const edge = readFileSync(join(web, 'lib/edge-tts.ts'), 'utf8');
    expect(gtts).toContain('ensureCompanionPlaybackRoute()');
    expect(audio).toContain('export function ensureCompanionPlaybackRoute');
    expect(audio).toContain("nav.audioSession.type = 'playback'");
    expect(edge).toContain('ensureCompanionPlaybackRoute()');
    expect(gtts).toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutput\(audio\)/);
  });
});
