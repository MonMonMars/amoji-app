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
import { resetVoiceExtras } from '../lib/voice-extras';
import { buildEdgeSsml } from '../lib/edge-tts';
import { selectTtsButtons, isSingleVoiceLocale, TIER_A_COUNTS } from '../lib/tts-button-registry';
import {
  ENGINE_VERDICTS,
  VOICE_CHOICES,
  addVoiceOption,
  deliveryGenderForChoice,
  distinctVoiceCount,
  engineIsOffered,
  engineStatus,
  hiddenEngines,
  preferredVoiceChoiceForGender,
  tlForChoice,
  voiceAddRemaining,
  voiceChoicesFor,
} from '../lib/voice-capability';

const here = path.dirname(fileURLToPath(import.meta.url));
const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');
const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');

afterEach(() => {
  resetVoicePicks();
  resetVoiceExtras();
});

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
  it('offers distinct speakers only — no 58 Edge names, no pitch/gender clones', () => {
    // 58 Edge short names all collapsed to one voice; the old fix then made
    // female/male × deep/mid/bright clones of the SAME female MP3. Now one
    // button per real Google `tl` speaker: 1 + 2 + 1 + 5.
    expect(selectTtsButtons()).toHaveLength(9);
    expect(selectTtsButtons('yue')).toHaveLength(1);
    expect(selectTtsButtons('zh')).toHaveLength(2);
    expect(selectTtsButtons('ja')).toHaveLength(1);
    expect(selectTtsButtons('en')).toHaveLength(5);
  });

  it('keeps every button on the truthful female source and the natural tier', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const buttons = selectTtsButtons(locale);
      expect(buttons.every((b) => b.deliveryGender === 'female'), locale).toBe(true);
      expect(buttons.every((b) => b.pitchTier === 'mid'), locale).toBe(true);
    }
  });

  it('marks single-speaker langs (yue/ja) vs multi-region (zh/en)', () => {
    expect(distinctVoiceCount('yue')).toBe(1);
    expect(distinctVoiceCount('ja')).toBe(1);
    expect(distinctVoiceCount('zh')).toBe(2);
    expect(distinctVoiceCount('en')).toBe(5);
    expect(isSingleVoiceLocale('yue')).toBe(true);
    expect(isSingleVoiceLocale('ja')).toBe(true);
    expect(isSingleVoiceLocale('zh')).toBe(false);
    expect(isSingleVoiceLocale('en')).toBe(false);
  });

  it('never produces duplicate choice ids', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
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

  it('labels each button with its actual source gender and natural tier', () => {
    for (const button of selectTtsButtons()) {
      expect(button.deliveryGender).toBe('female');
      expect(button.pitchTier).toBe('mid');
    }
  });

  it('Add appends exactly one button for the next free test-pool voice', () => {
    expect(voiceAddRemaining('en')).toBeGreaterThan(0);
    const before = selectTtsButtons('en').length;
    const added = addVoiceOption('en');
    expect(added).not.toBeNull();
    expect(added!.locale).toBe('en');
    expect(added!.deliveryGender).toBe('female');
    expect(added!.pitchTier).toBe('mid');
    expect(selectTtsButtons('en')).toHaveLength(before + 1);
    expect(selectTtsButtons('en').some((b) => b.id === added!.id)).toBe(true);
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
    saveVoicePick('en', 'gtts:en-GB:f:mid');
    expect(voicePickFor('en')).toBe('gtts:en-GB:f:mid');
    expect(activeVoiceChoice('en').tl).toBe('en-GB');
    expect(activeVoiceChoice('en').pitchTier).toBe('mid');
  });

  it('refuses an id that belongs to another language', () => {
    saveVoicePick('ja', 'gtts:en-GB:f:mid');
    expect(voicePickFor('ja')).toBeNull();
    expect(activeVoiceChoice('ja').tl).toBe('ja');
  });

  it('migrates legacy pins without gender or pitch suffix to the female source', () => {
    saveVoicePick('en', 'gtts:en-US');
    expect(voicePickFor('en')).toBe('gtts:en-US:f:mid');
    saveVoicePick('yue', 'gtts:yue');
    expect(voicePickFor('yue')).toBe('gtts:yue:f:mid');
    // A legacy "male" id was the same female speaker — resolve truthfully.
    saveVoicePick('en', 'gtts:en-GB:m');
    expect(voicePickFor('en')).toBe('gtts:en-GB:f:mid');
    saveVoicePick('en', 'gtts:en-GB:m:bright');
    expect(voicePickFor('en')).toBe('gtts:en-GB:f:mid');
  });

  it('migrates legacy Taiwan gTTS pins to Taiwan Mandarin female mid', () => {
    saveVoicePick('zh', 'gtts:zh-TW');
    expect(voicePickFor('zh')).toBe('gtts:zh-TW:f:mid');
    expect(activeVoiceChoice('zh').tl).toBe('zh-TW');
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

  it('pinned delivery reports the source gender; unpinned falls back to the companion', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      expect(deliveryGenderForChoice(locale, null, 'male')).toBe('male');
      expect(deliveryGenderForChoice(locale, null, 'female')).toBe('female');
      // There is no male gTTS source, so this resolver keeps the female
      // speaker rather than a falsely-labelled / pitch-shifted "male".
      expect(preferredVoiceChoiceForGender(locale, 'male').deliveryGender).toBe('female');
      expect(preferredVoiceChoiceForGender(locale, 'female').deliveryGender).toBe('female');
      // The picker-level default is gender-aware: a male companion is shown
      // the male relay voice, never the female Google speaker (owner
      // 2026-11-26: "default use male or female based on the gender").
      expect(activeVoiceChoice(locale, 'male').deliveryGender).toBe('male');
      expect(activeVoiceChoice(locale, 'female').deliveryGender).toBe('female');
      expect(tlForChoice(locale, preferredVoiceChoiceForGender(locale, 'male').id).length).toBeGreaterThan(1);
      expect(tlForChoice(locale, preferredVoiceChoiceForGender(locale, 'female').id).length).toBeGreaterThan(1);
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
    expect(tlForChoice('en', 'gtts:en-IN:f:bright')).toBe('en-IN');
    expect(tlForChoice('en', 'gtts:zh-CN:m:mid')).toBe('en-US');
    expect(tlForChoice('zh', 'gtts:zh-CN:m:deep')).toBe('zh-CN');
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
    expect(edgeSampleText('yue')).toBe('Hello，今日天氣幾好。我係你嘅語音助手。');
    expect(edgeSampleText('zh')).toBe('Hello，今天天气不错。我是你的语音助手。');
    expect(edgeSampleText('ja')).toBe('こんにちは。今日はいい天気ですね。私は音声アシスタントです。');
    expect(edgeSampleText('en')).toBe("Hi there. Nice to meet you. I'm your voice companion.");
  });
});
