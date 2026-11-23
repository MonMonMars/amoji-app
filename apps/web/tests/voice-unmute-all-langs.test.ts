/**
 * Owner CRITICAL: only Yue female had voice; male / deep·mid·bright others /
 * en·zh·ja were mute. Guard the speak path so every lang × gender × pitch
 * resolves an audible free-tier route on default speakers.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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

afterEach(() => {
  resetVoicePicks();
});

describe('every locale has an audible original-TTS choice', () => {
  it('ships at least one female source button in every locale', () => {
    for (const locale of LOCALES) {
      const choices = voiceChoicesFor(locale);
      expect(choices.length, locale).toBeGreaterThan(0);
      for (const choice of choices) {
        expect(choice.deliveryGender, `${locale} ${choice.tl}`).toBe('female');
        expect(choice.tl.length).toBeGreaterThan(0);
        if (locale === 'yue') expect(choice.tl).toBe('yue');
        else expect(choice.tl).not.toBe('yue');
      }
    }
  });

  it('yue is not the only non-empty tl path; every locale keeps its own speaker', () => {
    const yueF = preferredVoiceChoiceForGender('yue', 'female');
    const enM = preferredVoiceChoiceForGender('en', 'male');
    const zhF = preferredVoiceChoiceForGender('zh', 'female');
    const jaM = preferredVoiceChoiceForGender('ja', 'male');
    expect(yueF.tl).toBe('yue');
    expect(enM.tl).toBe('en-US');
    expect(zhF.tl).toBe('zh-CN');
    expect(jaM.tl).toBe('ja');
    // "male" is a companion gender, not a claim about the Google source: the
    // resolved button is the female speaker and the label says so.
    expect(deliveryGenderForChoice('en', enM.id, 'female')).toBe('female');
    expect(deliveryGenderForChoice('zh', zhF.id, 'male')).toBe('female');
  });

  it('never zero / NaN / reshaped: the bias is exactly 1 for all pins', () => {
    for (const locale of LOCALES) {
      for (const tier of VOICE_PITCH_TIERS) {
        const choice = voiceChoicesFor(locale).find((c) => c.pitchTier === tier)!;
        const bias = gttsCharacterPitchBias('female', 'preview', locale, tier);
        expect(Number.isFinite(bias)).toBe(true);
        expect(bias).toBe(1);
        expect(pitchTierForChoice(choice.id)).toBe(tier);
        expect(voiceChoiceById(choice.id)?.locale).toBe(locale);
      }
    }
  });

  it('save + tlForChoice keeps each locale on its own speaker (not Yue-only)', () => {
    for (const locale of LOCALES) {
      for (const gender of ['female', 'male'] as const) {
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
    expect(gesture).not.toMatch(/pinDefaultOutputAsync\(audio\)/);
    expect(gesture).toMatch(/startHtmlAudioOnDefaultSpeakers\(audio,\s*'gesture-safe'\)/);

    expect(audio).toContain('Never copy AudioContext.sinkId');
    expect(audio).not.toMatch(/sharedCtx[\s\S]{0,80}\.sinkId/);
    expect(audio).toContain("mode: 'gesture-safe' | 'pin-before-play'");
    expect(audio).toContain('startHtmlAudioOnDefaultSpeakers');
  });

  it('beginTts / greeting / preview force playback session for every lang', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).toMatch(/const beginTts = \(\) => \{[\s\S]*?companionPlaybackSession\(\)/);
    expect(voice).toMatch(/playVoiceGreeting\([\s\S]*?ensureCompanionPlaybackRoute\(\)/);
    expect(voice).toMatch(/playVoiceGreeting\([\s\S]*?primeDefaultSpeakerBeforeSynth/);
    expect(voice).toMatch(/previewVoiceChoice\([\s\S]*?ensureCompanionPlaybackRoute\(\)/);
    expect(voice).toMatch(/previewVoiceChoice\([\s\S]*?primeDefaultSpeakerBeforeSynth/);
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
