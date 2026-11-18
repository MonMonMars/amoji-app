/**
 * Owner CRITICAL: only Yue female had voice; male / deep·mid·bright others /
 * en·zh·ja were mute. Guard the speak path so every lang × gender × pitch
 * resolves an audible free-tier route on default speakers.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GTTS_PITCH_BIAS_MAX,
  GTTS_PITCH_BIAS_MIN,
  gttsPlaybackRate,
} from '../lib/gtts';
import { gttsCharacterPitchBias } from '../lib/gtts-timbre';
import {
  deliveryGenderForChoice,
  pitchTierForChoice,
  preferredVoiceChoiceForGender,
  tlForChoice,
  voiceChoiceById,
  voiceChoicesFor,
  VOICE_PITCH_TIERS,
} from '../lib/voice-capability';
import { resetVoicePicks, saveVoicePick } from '../lib/voice-picks';

const web = join(__dirname, '..');
const LOCALES = ['yue', 'zh', 'ja', 'en'] as const;
const GENDERS = ['female', 'male'] as const;

afterEach(() => {
  resetVoicePicks();
});

describe('every lang × gender × pitch is an audible free-tier choice', () => {
  it('ships female + male × deep/mid/bright for every locale', () => {
    for (const locale of LOCALES) {
      const choices = voiceChoicesFor(locale);
      for (const gender of GENDERS) {
        for (const tier of VOICE_PITCH_TIERS) {
          const hit = choices.find(
            (c) => c.deliveryGender === gender && c.pitchTier === tier,
          );
          expect(hit, `${locale} ${gender} ${tier}`).toBeTruthy();
          expect(hit!.tl.length).toBeGreaterThan(0);
          if (locale === 'yue') expect(hit!.tl).toBe('yue');
          else expect(hit!.tl).not.toBe('yue');
        }
      }
    }
  });

  it('yue female mid is not the only non-empty tl path', () => {
    const yueF = preferredVoiceChoiceForGender('yue', 'female');
    const enM = preferredVoiceChoiceForGender('en', 'male');
    const zhF = preferredVoiceChoiceForGender('zh', 'female');
    const jaM = preferredVoiceChoiceForGender('ja', 'male');
    expect(yueF.tl).toBe('yue');
    expect(enM.tl).toBe('en-US');
    expect(zhF.tl).toBe('zh-CN');
    expect(jaM.tl).toBe('ja');
    expect(deliveryGenderForChoice('en', enM.id, 'female')).toBe('male');
    expect(deliveryGenderForChoice('zh', zhF.id, 'male')).toBe('female');
  });

  it('pitchBias stays audible (never zero / NaN) for all pins', () => {
    for (const locale of LOCALES) {
      for (const gender of GENDERS) {
        for (const tier of VOICE_PITCH_TIERS) {
          const choice = voiceChoicesFor(locale).find(
            (c) => c.deliveryGender === gender && c.pitchTier === tier,
          )!;
          const bias = gttsCharacterPitchBias(gender, 'preview', locale, tier);
          expect(Number.isFinite(bias)).toBe(true);
          expect(bias).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
          const rate = gttsPlaybackRate(gender === 'male' ? 0.90 : 1, bias, choice.tl);
          expect(rate).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
          expect(rate).toBeLessThanOrEqual(GTTS_PITCH_BIAS_MAX);
          expect(pitchTierForChoice(choice.id)).toBe(tier);
          expect(voiceChoiceById(choice.id)?.locale).toBe(locale);
        }
      }
    }
  });

  it('save + tlForChoice keeps each locale on its own speaker (not Yue-only)', () => {
    for (const locale of LOCALES) {
      for (const gender of GENDERS) {
        const choice = preferredVoiceChoiceForGender(locale, gender);
        saveVoicePick(locale, choice.id);
        expect(tlForChoice(locale, choice.id)).toBe(choice.tl);
        if (locale !== 'yue') {
          expect(tlForChoice(locale, choice.id)).not.toBe('yue');
        }
      }
    }
  });
});

describe('TTS play path never mutes non-Yue via setSinkId', () => {
  it('gtts/edge/gesture clips never pin inside onplay; helper owns play+pin modes', () => {
    const gtts = readFileSync(join(web, 'lib/gtts.ts'), 'utf8');
    const edge = readFileSync(join(web, 'lib/edge-tts.ts'), 'utf8');
    const clip = readFileSync(join(web, 'lib/play-voice-clip.ts'), 'utf8');
    const audio = readFileSync(join(web, 'lib/audio-output.ts'), 'utf8');

    expect(gtts).toContain('ensureCompanionPlaybackRoute()');
    expect(gtts).toContain('startHtmlAudioOnDefaultSpeakers');
    expect(gtts).toContain('pinSinkBeforePlay');
    expect(gtts).not.toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutput\(audio\)/);
    expect(gtts).not.toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutputAsync\(/);

    expect(edge).toContain('ensureCompanionPlaybackRoute()');
    expect(edge).toContain('startHtmlAudioOnDefaultSpeakers');
    const edgeOnplay = edge.indexOf('audio.onplay = () => {');
    const edgeOnplayEnd = edge.indexOf('};', edgeOnplay);
    expect(edge.slice(edgeOnplay, edgeOnplayEnd)).not.toMatch(/pinDefaultOutput\(/);
    expect(edge.slice(edgeOnplay, edgeOnplayEnd)).not.toMatch(/pinDefaultOutputAsync\(/);

    const gesture = clip.slice(
      clip.indexOf('export function playGestureClipSync'),
      clip.indexOf('export function playVoiceClip'),
    );
    expect(gesture).not.toMatch(/pinDefaultOutput\(audio\)/);
    expect(gesture).toMatch(/pinDefaultOutputAsync\(audio\)[\s\S]*audio\.play\(\)/);
    expect(gesture).not.toMatch(/await pinDefaultOutputAsync/);

    expect(audio).toContain('Never copy AudioContext.sinkId');
    expect(audio).not.toMatch(/sharedCtx[\s\S]{0,80}\.sinkId/);
    expect(audio).toContain("mode: 'gesture-safe' | 'pin-before-play'");
    expect(audio).toContain('startHtmlAudioOnDefaultSpeakers');
  });

  it('beginTts / greeting / preview force playback session for every lang', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).toMatch(/const beginTts = \(\) => \{[\s\S]*?companionPlaybackSession\(\)/);
    expect(voice).toMatch(/playVoiceGreeting\([\s\S]*?duckExternalAudioForCompanion\(\)/);
    const greetBody = voice.slice(
      voice.indexOf('export function playVoiceGreeting'),
      voice.indexOf('export function previewLibraryClip'),
    );
    expect(greetBody).not.toMatch(/void primeDefaultSpeakerBeforeSynth\(\)/);
    expect(voice).toMatch(/previewVoiceChoice\([\s\S]*?duckExternalAudioForCompanion\(\)/);
    const previewBody = voice.slice(
      voice.indexOf('export function previewVoiceChoice'),
      voice.indexOf('export function previewOsVoice'),
    );
    expect(previewBody).not.toMatch(/void primeDefaultSpeakerBeforeSynth\(\)/);
    expect(voice).toMatch(/greetGttsOpts[\s\S]*?pinSinkBeforePlay:\s*false/);
    expect(voice).toMatch(/greetGttsOpts[\s\S]*?gestureTap:\s*true/);
    expect(voice).toMatch(/previewGttsOpts[\s\S]*?pinSinkBeforePlay:\s*false/);
    expect(voice).toMatch(/previewGttsOpts[\s\S]*?gestureTap:\s*true/);
    expect(voice).toMatch(/speakGtts\(text, \{[\s\S]*?pinSinkBeforePlay:\s*true/);
    // Permanent: no audible insurance on card greet / preview.
    expect(voice).not.toContain('clipFile(lang, delivery, insuranceKind)');
    expect(voice).not.toContain('clipFile(locale, previewGender, insuranceKind)');
    expect(voice).not.toContain('playGestureClipSync(');
  });
});
