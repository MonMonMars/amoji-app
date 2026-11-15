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
  it('offers distinct speakers × gender × pitch, never the 58 Edge names', () => {
    // 58 Edge short names all collapsed to one voice. The real map is one
    // Google `tl` speaker × female/male × deep/mid/bright pitch buttons.
    expect(selectTtsButtons()).toHaveLength(54);
    expect(selectTtsButtons('yue')).toHaveLength(6);
    expect(selectTtsButtons('zh')).toHaveLength(12);
    expect(selectTtsButtons('ja')).toHaveLength(6);
    expect(selectTtsButtons('en')).toHaveLength(30);
  });

  it('keeps female + male and deep/mid/bright for every regional speaker', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const buttons = selectTtsButtons(locale);
      expect(buttons.some((b) => b.deliveryGender === 'female'), locale).toBe(true);
      expect(buttons.some((b) => b.deliveryGender === 'male'), locale).toBe(true);
      const byTlGender = new Map<string, Set<string>>();
      for (const b of buttons) {
        const key = `${b.tl}:${b.deliveryGender}`;
        const set = byTlGender.get(key) ?? new Set();
        set.add(b.pitchTier);
        byTlGender.set(key, set);
      }
      for (const [key, tiers] of byTlGender) {
        expect(tiers.has('deep'), `${locale}/${key}`).toBe(true);
        expect(tiers.has('mid'), `${locale}/${key}`).toBe(true);
        expect(tiers.has('bright'), `${locale}/${key}`).toBe(true);
      }
    }
  });

  it('marks single-speaker langs (yue/ja) vs multi-region (zh/en); pitch still multiplies buttons', () => {
    expect(distinctVoiceCount('yue')).toBe(6);
    expect(distinctVoiceCount('ja')).toBe(6);
    expect(isSingleVoiceLocale('yue')).toBe(true);
    expect(isSingleVoiceLocale('ja')).toBe(true);
    expect(isSingleVoiceLocale('zh')).toBe(false);
    expect(isSingleVoiceLocale('en')).toBe(false);
  });

  it('never produces duplicate choice ids; same tl may pair female + male delivery', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const ids = selectTtsButtons(locale).map((b) => b.id);
      expect(new Set(ids).size, locale).toBe(ids.length);
      const genders = selectTtsButtons(locale).map((b) => b.deliveryGender);
      expect(genders.filter((g) => g === 'female').length, locale).toBeGreaterThanOrEqual(1);
      expect(genders.filter((g) => g === 'male').length, locale).toBeGreaterThanOrEqual(1);
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
    expect(TIER_A_COUNTS).toEqual({ yue: 6, zh: 12, ja: 6, en: 30 });
  });

  it('labels female/male and pitch colour honestly on each button', () => {
    for (const button of selectTtsButtons()) {
      expect(button.deliveryGender === 'female' || button.deliveryGender === 'male').toBe(true);
      expect(['deep', 'mid', 'bright']).toContain(button.pitchTier);
    }
  });

  it('Add appends deep/mid/bright for the next free test-pool voice', () => {
    expect(voiceAddRemaining('en')).toBeGreaterThan(0);
    const before = selectTtsButtons('en').length;
    const added = addVoiceOption('en');
    expect(added).not.toBeNull();
    expect(added!.locale).toBe('en');
    expect(added!.pitchTier).toBe('mid');
    expect(selectTtsButtons('en')).toHaveLength(before + 3);
    expect(selectTtsButtons('en').some((b) => b.id === added!.id)).toBe(true);
    const stem = added!.id.replace(/:mid$/, '');
    expect(selectTtsButtons('en').some((b) => b.id === `${stem}:deep`)).toBe(true);
    expect(selectTtsButtons('en').some((b) => b.id === `${stem}:bright`)).toBe(true);
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

  it('migrates legacy pins without gender or pitch suffix to mid female', () => {
    saveVoicePick('en', 'gtts:en-US');
    expect(voicePickFor('en')).toBe('gtts:en-US:f:mid');
    saveVoicePick('yue', 'gtts:yue');
    expect(voicePickFor('yue')).toBe('gtts:yue:f:mid');
    saveVoicePick('en', 'gtts:en-GB:m');
    expect(voicePickFor('en')).toBe('gtts:en-GB:m:mid');
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

  it('unpinned delivery gender follows the companion, not the first female button', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      expect(deliveryGenderForChoice(locale, null, 'male')).toBe('male');
      expect(deliveryGenderForChoice(locale, null, 'female')).toBe('female');
      expect(preferredVoiceChoiceForGender(locale, 'male').deliveryGender).toBe('male');
      expect(preferredVoiceChoiceForGender(locale, 'female').deliveryGender).toBe('female');
      expect(activeVoiceChoice(locale, 'male').deliveryGender).toBe('male');
      expect(activeVoiceChoice(locale, 'female').deliveryGender).toBe('female');
      // Every shipping lang has a working Google tl for both genders.
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
