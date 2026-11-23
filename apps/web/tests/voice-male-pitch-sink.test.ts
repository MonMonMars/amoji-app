/**
 * Male pins must not resurrect a female voice with a male label.
 *
 * History: #406/#410 added male "pitch sink" — the same female Google MP3 at
 * playbackRate 0.64 with preservesPitch=false. The owner reported "all the
 * male voice in all language are female voice instead", which is exactly what
 * that produced. The fix is truthful labelling plus original audio, not a
 * deeper resample. This suite pins the honest behaviour and the sink routing
 * that must survive it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { gttsCharacterPitchBias } from '../lib/gtts-timbre';
import {
  deliveryGenderForChoice,
  gttsSpeakerGender,
  preferredVoiceChoiceForGender,
  tlForChoice,
  voiceChoiceById,
} from '../lib/voice-capability';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';

const web = join(__dirname, '..');

afterEach(() => {
  resetVoicePicks();
});

describe('legacy male pins resolve to the truthful female speaker', () => {
  it('male ids sink to the female source, and no pitch is applied', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const male = preferredVoiceChoiceForGender(locale, 'male');
      expect(male.deliveryGender).toBe('female');
      expect(gttsSpeakerGender(male.tl)).toBe('female');
      expect(deliveryGenderForChoice(locale, male.id, 'male')).toBe('female');
      expect(tlForChoice(locale, male.id)).toBe(male.tl);
      saveVoicePick(locale, `gtts:${male.tl}:m:mid`);
      expect(voicePickFor(locale)).toBe(`gtts:${male.tl}:f:mid`);
      expect(voiceChoiceById(voicePickFor(locale))?.deliveryGender).toBe('female');
      expect(gttsCharacterPitchBias('male', undefined, locale, 'mid')).toBe(1);
    }
  });

  it('gtts.ts has no pitch sink left', () => {
    const gtts = readFileSync(join(web, 'lib/gtts.ts'), 'utf8');
    expect(gtts).not.toMatch(/\.preservesPitch\s*=/);
    expect(gtts).not.toMatch(/GTTS_PITCH_BIAS|PITCH_BIAS_MALE|PITCH_BIAS_FEMALE/);
    expect(gtts).not.toMatch(/pitchBias\s*!==\s*1/);
  });

  it('voice.ts still passes delivery gender into Edge/synth, but gTTS is female', () => {
    const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
    expect(voice).not.toContain('clipFile(lang, delivery, insuranceKind)');
    expect(voice).toContain('gender: delivery');
    expect(voice).toContain('gender: previewGender');
    expect(voice).toContain('deliveryGenderForChoice(lang, voicePin, companionGender)');
    expect(voice).toContain('preferMale: spokenGender === \'male\'');
    expect(voice).toContain('edgeVoiceIdForTier');
  });
});

describe('non-yue speak path + sink routing', () => {
  it('non-yue preferred picks keep their own tl (not yue)', () => {
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
    expect(voice).toMatch(/const beginTts = \(\) => \{[\s\S]*?companionPlaybackSession\(\)/);
    expect(voice).toMatch(/playVoiceGreeting\([\s\S]*?duckExternalAudioForCompanion\(\)/);
    expect(voice).toMatch(/previewVoiceChoice\([\s\S]*?duckExternalAudioForCompanion\(\)/);
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
