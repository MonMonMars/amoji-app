/**
 * Owner follow-up after #406/#410: pitch variants must differ audibly, male
 * pins must resolve male delivery + male pace (not female pitch-shifted),
 * and TTS must leave the mic communications sink for all langs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GTTS_PITCH_BIAS_MIN,
  GTTS_YUE_MALE_PACE_FLOOR,
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
    expect(brightF - deepF).toBeGreaterThanOrEqual(0.50);
    expect(brightM - deepM).toBeGreaterThanOrEqual(0.50);
    expect(FEMALE_TIER_OFFSET.bright - FEMALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.50);
    expect(MALE_TIER_OFFSET.bright - MALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.50);
  });

  it('male mid stays clearly below female mid', () => {
    expect(PITCH_BIAS_MALE).toBeLessThanOrEqual(0.66);
    expect(PITCH_BIAS_FEMALE).toBeGreaterThanOrEqual(1.28);
    expect(PITCH_BIAS_FEMALE - PITCH_BIAS_MALE).toBeGreaterThanOrEqual(0.60);
  });

  it('yue male pace floor does not collapse deep into mid', () => {
    expect(GTTS_YUE_MALE_PACE_FLOOR).toBe(GTTS_PITCH_BIAS_MIN);
    const deep = gttsPlaybackRate(1, gttsCharacterPitchBias('male', undefined, 'yue', 'deep'), 'yue');
    const mid = gttsPlaybackRate(1, PITCH_BIAS_MALE, 'yue');
    expect(deep).toBeLessThan(mid);
  });

  it('synth male pitch/rate sit clearly below female (browser fallback)', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).toMatch(/gender === 'male' \? 0\.68 : 1\.16/);
    expect(voice).toMatch(/gender === 'male' && lang === 'yue' \? 0\.86/);
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
    const maleMid = gttsCharacterPitchBias('male', undefined, 'en', 'mid');
    const femaleMid = gttsCharacterPitchBias('female', undefined, 'en', 'mid');
    expect(maleMid).toBe(PITCH_BIAS_MALE);
    expect(femaleMid).toBe(PITCH_BIAS_FEMALE);
    expect(maleMid).toBeLessThan(1);
    expect(gttsPlaybackRate(1, maleMid, 'yue')).toBeLessThan(1);
    expect(gttsPlaybackRate(1, maleMid, 'yue')).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
  });

  it('voice greeting/preview pass delivery gender + male pace into gTTS/Edge', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).not.toContain('clipFile(lang, delivery, insuranceKind)');
    expect(voice).toContain('gender: delivery');
    expect(voice).toContain('gender: previewGender');
    expect(voice).toContain("rate: delivery === 'male' ? 0.90 : 1");
    expect(voice).toContain("rate: previewGender === 'male' ? 0.90 : 1");
    expect(voice).toContain('gttsRateFor');
    expect(voice).toContain('deliveryGenderForChoice(lang, voicePin, companionGender)');
    expect(voice).toContain('preferMale: spokenGender === \'male\'');
    expect(voice).toContain('edgeVoiceIdForTier');
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

  it('voice.ts pins companion playback route for chat + audition on all langs', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    const gtts = readFileSync(join(web, 'lib/gtts.ts'), 'utf8');
    const audio = readFileSync(join(web, 'lib/audio-output.ts'), 'utf8');
    const edge = readFileSync(join(web, 'lib/edge-tts.ts'), 'utf8');
    expect(voice).toContain('ensureCompanionPlaybackRoute()');
    expect(voice).toMatch(/const beginTts = \(\) => \{[\s\S]*?ensureCompanionPlaybackRoute\(\)/);
    expect(voice).toMatch(/playVoiceGreeting\([\s\S]*?ensureCompanionPlaybackRoute\(\)/);
    expect(voice).toMatch(/previewVoiceChoice\([\s\S]*?ensureCompanionPlaybackRoute\(\)/);
    expect(gtts).toContain('ensureCompanionPlaybackRoute()');
    expect(audio).toContain('export function ensureCompanionPlaybackRoute');
    expect(audio).toContain("nav.audioSession.type = 'playback'");
    expect(edge).toContain('ensureCompanionPlaybackRoute()');
    // onplay must NOT pin — setSinkId mid-stream muted non-Yue / male TTS.
    const onplay = gtts.indexOf('audio.onplay = () => {');
    const onplayEnd = gtts.indexOf('};', onplay);
    expect(gtts.slice(onplay, onplayEnd)).not.toMatch(/pinDefaultOutput\(/);
    expect(gtts.slice(onplay, onplayEnd)).not.toMatch(/pinDefaultOutputAsync\(/);
    expect(gtts).toContain('startHtmlAudioOnDefaultSpeakers');
    expect(gtts).toContain('pinSinkBeforePlay');
  });
});
