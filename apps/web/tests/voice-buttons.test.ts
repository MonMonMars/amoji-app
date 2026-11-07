/**
 * The voice row must be honest: a button exists only when that engine can
 * actually produce a different sound on this device.
 *
 * Background: the browser voice row used to render 58 Edge neural buttons.
 * The Edge read-aloud endpoint refuses this app's client token (403 with it,
 * 401 without — verified from Node), so every tap fell through to the Google
 * Translate MP3 tier, which selects a speaker with `tl` and has no voice-id
 * parameter at all. Fifty-eight buttons, one sound. That is the report.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  edgeSampleText,
  edgeVoiceId,
  isFemaleNeuralVoice,
  isMaleNeuralVoice,
  isShippingEdgeVoice,
} from '../lib/voice-catalog';
import { resetVoicePicks, saveVoicePick, voicePickFor, activeVoiceChoice } from '../lib/voice-picks';
import { buildEdgeSsml } from '../lib/edge-tts';
import { selectTtsButtons, isSingleVoiceLocale, TIER_A_COUNTS } from '../lib/tts-button-registry';
import {
  ENGINE_VERDICTS,
  VOICE_CHOICES,
  distinctVoiceCount,
  engineIsOffered,
  engineStatus,
  hiddenEngines,
  tlForChoice,
  voiceChoicesFor,
} from '../lib/voice-capability';

const here = path.dirname(fileURLToPath(import.meta.url));
const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');
const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');

afterEach(() => resetVoicePicks());

describe('engine audit', () => {
  it('classifies every engine the catalog mentions', () => {
    const catalogEngines = new Set(
      [
        'edge', 'speech', 'kokoro', 'piper', 'melotts', 'bark', 'canto-nano',
        'silencio2', 'chatterbox-turbo', 'vui-nano', 'lure-tts',
      ],
    );
    for (const engine of catalogEngines) {
      expect(engineStatus(engine), engine).not.toBeNull();
    }
    // Held/refused engines stay out of the selectable set.
    for (const held of ['cosyvoice', 'voxcpm2', 'qwen3-tts', 'coqui', 'fish-speech', 'f5-tts']) {
      expect(engineIsOffered(held)).toBe(false);
    }
  });

  it('records Edge as dead and Google Translate as the only working engine', () => {
    expect(engineStatus('edge')).toBe('dead');
    expect(engineStatus('gtts')).toBe('works');
    const working = ENGINE_VERDICTS.filter((v) => v.status === 'works').map((v) => v.engine);
    expect(working).toEqual(['gtts']);
  });

  it('keeps the iOS-muted and key-gated engines out of the free button set', () => {
    // speechSynthesis is muted by the iOS silent switch; OpenAI needs a key.
    // Neither may masquerade as a free pickable button.
    expect(engineStatus('speech')).toBe('browser');
    expect(engineStatus('openai')).toBe('gated');
    expect(engineIsOffered('speech')).toBe(false);
    expect(engineIsOffered('openai')).toBe(false);
  });

  it('marks the unbundled models as not-bundled rather than pretending', () => {
    for (const engine of ['kokoro', 'piper', 'melotts', 'bark', 'canto-nano', 'silencio2', 'chatterbox-turbo', 'vui-nano', 'lure-tts']) {
      expect(engineStatus(engine), engine).toBe('not-bundled');
    }
    expect(hiddenEngines().every((v) => v.status !== 'works')).toBe(true);
  });

  it('gives every verdict a real evidence string', () => {
    for (const verdict of ENGINE_VERDICTS) {
      expect(verdict.evidence.trim().length, verdict.engine).toBeGreaterThan(20);
    }
  });
});

describe('one button per genuinely different voice', () => {
  it('offers exactly the distinct speakers, never the 58 Edge names', () => {
    // 58 Edge short names all collapsed to one voice. The real map is one
    // button per distinct Google `tl` speaker measured with four sentences.
    expect(selectTtsButtons()).toHaveLength(9);
    expect(selectTtsButtons('yue')).toHaveLength(1);
    expect(selectTtsButtons('zh')).toHaveLength(2);
    expect(selectTtsButtons('ja')).toHaveLength(1);
    expect(selectTtsButtons('en')).toHaveLength(5);
  });

  it('collapses to exactly one selectable entry where only one voice exists', () => {
    // Cantonese and Japanese really do have a single voice each. That is a
    // finding, not a bug: the row shows one button and says why.
    for (const locale of ['yue', 'ja'] as const) {
      expect(distinctVoiceCount(locale)).toBe(1);
      expect(selectTtsButtons(locale)).toHaveLength(1);
      expect(isSingleVoiceLocale(locale)).toBe(true);
    }
    // A language with more than one voice is not a single-voice locale.
    expect(isSingleVoiceLocale('en')).toBe(false);
    expect(isSingleVoiceLocale('zh')).toBe(false);
  });

  it('never produces a duplicate speaker inside a language', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const tls = selectTtsButtons(locale).map((b) => b.tl);
      // Distinct speaker per button — this is what makes them audibly differ.
      expect(new Set(tls).size, locale).toBe(tls.length);
      const ids = selectTtsButtons(locale).map((b) => b.id);
      expect(new Set(ids).size, locale).toBe(ids.length);
    }
  });

  it('numbers buttons 1..n inside each language', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      expect(selectTtsButtons(locale).map((b) => b.n)).toEqual(
        selectTtsButtons(locale).map((_, i) => i + 1),
      );
    }
  });

  it('agrees with TIER_A_COUNTS', () => {
    expect(TIER_A_COUNTS).toEqual({ yue: 1, zh: 2, ja: 1, en: 5 });
  });

  it('does not expose a gender filter — the live voices are not gendered', () => {
    // A male/female split would invent a distinction the audio does not have.
    for (const button of selectTtsButtons()) {
      expect('gender' in button).toBe(false);
    }
  });
});

describe('voice row and picker are capability-gated', () => {
  it('the row builds its buttons from the gated registry, not Edge names', () => {
    expect(row).toContain('selectTtsButtons');
    expect(row).toContain("selectTtsButtons(lang)");
    expect(row).not.toContain('EDGE_VOICE_BUTTONS');
    expect(row).not.toContain('genderFemale');
    expect(row).not.toContain('genderMale');
  });

  it('the row says why a language has one voice instead of looking broken', () => {
    expect(row).toContain('isSingleVoiceLocale');
    expect(row).toContain("t(lang, 'voiceOnlyOneAvailable')");
    expect(row).toContain('tts-voice-single-note');
  });

  it('the settings picker lists only offered voices and names the dead engines', () => {
    expect(picker).toContain('selectTtsButtons(locale)');
    expect(picker).not.toContain('EDGE_VOICE_BUTTONS');
    expect(picker).toContain("t(lang, 'voiceEnginesUnavailable')");
    expect(picker).toContain('isSingleVoiceLocale');
  });

  it('a button previews the exact speaker it stands for', () => {
    expect(row).toContain('playVoiceGreeting(characterId, button.locale, button.id)');
    expect(picker).toContain('previewVoiceChoice(button.locale, button.id)');
  });

  it('preview/greeting no longer claim to address an Edge short name', () => {
    const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain('export function previewVoiceChoice');
    expect(voice).not.toContain('export function previewEdgeVoice');
    // The greeting passes the chosen region through to the live tier.
    const greetStart = voice.indexOf('export function playVoiceGreeting');
    const greetEnd = voice.indexOf('export function previewLibraryContent', greetStart) > 0
      ? voice.indexOf('export function previewLibraryContent', greetStart)
      : voice.indexOf('export function previewLibraryClip', greetStart);
    const greet = voice.slice(greetStart, greetEnd);
    expect(greet).toContain('tlForChoice(lang, choiceId)');
    expect(greet).toContain('tl,');
  });
});

describe('pin storage names a real voice', () => {
  it('pins a choice id and returns it for that language', () => {
    expect(voicePickFor('en')).toBeNull();
    saveVoicePick('en', 'gtts:en-GB');
    expect(voicePickFor('en')).toBe('gtts:en-GB');
    expect(activeVoiceChoice('en').tl).toBe('en-GB');
  });

  it('refuses an id that belongs to another language', () => {
    saveVoicePick('ja', 'gtts:en-GB');
    expect(voicePickFor('ja')).toBeNull();
    expect(activeVoiceChoice('ja').tl).toBe('ja');
  });

  it('refuses an id that no longer exists', () => {
    saveVoicePick('en', 'en-US-AriaNeural');
    expect(voicePickFor('en')).toBeNull();
    expect(activeVoiceChoice('en').tl).toBe('en-US');
  });

  it('falls back to a speaker from the SAME language, never another one', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const choice = activeVoiceChoice(locale);
      expect(choice.locale).toBe(locale);
      expect(tlForChoice(locale, null)).toBe(choice.tl);
    }
  });
});

describe('tl mapping', () => {
  it('maps each language to its default speaker', () => {
    expect(tlForChoice('yue', null)).toBe('yue');
    expect(tlForChoice('zh', null)).toBe('zh-CN');
    expect(tlForChoice('ja', null)).toBe('ja');
    expect(tlForChoice('en', null)).toBe('en-US');
  });

  it('honours a pinned choice for this language and ignores a foreign one', () => {
    expect(tlForChoice('en', 'gtts:en-IN')).toBe('en-IN');
    expect(tlForChoice('en', 'gtts:zh-TW')).toBe('en-US');
    expect(tlForChoice('zh', 'gtts:zh-TW')).toBe('zh-TW');
  });

  it('uses real Google Translate codes', () => {
    for (const choice of VOICE_CHOICES) {
      // Google accepts both a bare language ('yue', 'ja') and a language-region
      // pair ('zh-TW', 'en-GB'); both are live and both select a speaker.
      expect(choice.tl).toMatch(/^[a-z]{2,3}(-[A-Z]{2})?$/);
      expect(voiceChoicesFor(choice.locale)).toContain(choice);
    }
  });
});

describe('Edge cast machinery still stands for the day Edge returns', () => {
  it('keeps gender-correct cast defaults', () => {
    expect(edgeVoiceId('yue', 'female')).toBe('zh-HK-HiuMaanNeural');
    expect(edgeVoiceId('zh', 'male')).toBe('zh-CN-YunjianNeural');
    expect(edgeVoiceId('ja', 'male')).toBe('ja-JP-KeitaNeural');
    expect(edgeVoiceId('en', 'female')).toBe('en-US-JennyNeural');
  });

  it('keeps the Cantonese neural ids distinct in SSML', () => {
    const male = buildEdgeSsml(edgeSampleText('yue'), {
      lang: 'yue', gender: 'female', voiceId: 'zh-HK-WanLungNeural',
    });
    const female = buildEdgeSsml(edgeSampleText('yue'), {
      lang: 'yue', gender: 'male', voiceId: 'zh-HK-HiuMaanNeural',
    });
    expect(male).toContain("voice name='zh-HK-WanLungNeural'");
    expect(female).toContain("voice name='zh-HK-HiuMaanNeural'");
    expect(isMaleNeuralVoice('zh-HK-WanLungNeural')).toBe(true);
    expect(isFemaleNeuralVoice('zh-HK-HiuMaanNeural')).toBe(true);
    expect(isShippingEdgeVoice('zh-HK-HiuMaanNeural')).toBe(true);
  });

  it('keeps the per-language sample lines the preview speaks', () => {
    expect(edgeSampleText('yue')).toBe('你好呀，今日天氣幾好。我係你嘅語音助手。');
    expect(edgeSampleText('zh')).toBe('你好，今天天气不错。我是你的语音助手。');
    expect(edgeSampleText('ja')).toBe('こんにちは。今日はいい天気ですね。私は音声アシスタントです。');
    expect(edgeSampleText('en')).toBe("Hi there. Nice to meet you. I'm your voice companion.");
  });
});
