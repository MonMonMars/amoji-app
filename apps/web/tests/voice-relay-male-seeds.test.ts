/**
 * Male voice buttons are back (owner report 2026-11-25): "the male voice button
 * are all gone" and "seems all voice button using the same female voice".
 *
 * Commit 5989fce0 deleted every male seed, correctly at the time: the only male
 * option was a pitched-down woman on the Google MP3. What changed is the
 * transport — the TTS relay now carries real Edge neural audio — so the male
 * option returns as a DIFFERENT ENGINE, never as a relabelled Google speaker.
 *
 * These tests are the ones that would catch the regression coming back:
 *   1. the four seeded ids are the real Edge male voices, per language;
 *   2. they render (and resolve) only while the relay is configured;
 *   3. with no relay they are inert — no button, no pin, no resolution — so a
 *      static export cannot show a male button that can only be silent or a
 *      woman's voice;
 *   4. the gTTS catalogue itself is untouched: still nine female speakers.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RELAY_MALE_SEEDS,
  deliveryGenderForChoice,
  edgeChoiceId,
  edgeRelayAvailable,
  pitchTierForChoice,
  relayMaleChoicesFor,
  tlForChoice,
  voiceChoiceById,
} from '../lib/voice-capability';
import { selectRelayVoiceButtons, selectTtsButtons } from '../lib/tts-button-registry';
import { DEFAULT_TTS_PROXY, setTtsProxy } from '../lib/edge-tts';
import { isMaleNeuralVoice, isShippingEdgeVoice } from '../lib/voice-catalog';
import { resetVoicePicks } from '../lib/voice-picks';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOCALES = ['yue', 'zh', 'ja', 'en'] as const;

/** Exact ids the relay was verified to return audio for (2026-11-24). */
const EXPECTED: Record<(typeof LOCALES)[number], string> = {
  yue: 'zh-HK-WanLungNeural', // owner priority: "WanLung 男"
  zh: 'zh-CN-YunjianNeural',
  ja: 'ja-JP-KeitaNeural',
  en: 'en-US-GuyNeural',
};

beforeEach(() => {
  setTtsProxy(DEFAULT_TTS_PROXY);
});

afterEach(() => {
  resetVoicePicks();
  setTtsProxy(DEFAULT_TTS_PROXY);
});

describe('male seeds name real Edge male voices', () => {
  it('maps one male per language to the verified Edge neural id', () => {
    for (const locale of LOCALES) {
      const seeds = RELAY_MALE_SEEDS.filter((s) => s.locale === locale);
      expect(seeds, locale).toHaveLength(1);
      expect(seeds[0]!.edgeVoiceId, locale).toBe(EXPECTED[locale]);
    }
  });

  it('every seeded id is a shipping Edge voice whose name reads male', () => {
    for (const seed of RELAY_MALE_SEEDS) {
      expect(isShippingEdgeVoice(seed.edgeVoiceId), seed.edgeVoiceId).toBe(true);
      expect(isMaleNeuralVoice(seed.edgeVoiceId), seed.edgeVoiceId).toBe(true);
    }
  });

  it('puts WanLung first — the owner asked for the Cantonese male', () => {
    expect(RELAY_MALE_SEEDS[0]!.edgeVoiceId).toBe('zh-HK-WanLungNeural');
  });

  it('ships exactly one male button per language, at the natural tier', () => {
    expect(RELAY_MALE_SEEDS).toHaveLength(4);
    for (const choice of LOCALES.flatMap((locale) => relayMaleChoicesFor(locale))) {
      expect(choice.pitchTier).toBe('mid');
      expect(choice.deliveryGender).toBe('male');
      expect(choice.engine).toBe('edge');
      expect(choice.edgeVoiceId).toBeTruthy();
    }
  });
});

describe('the relay gate decides whether a male button exists at all', () => {
  it('offers the male buttons while the relay is configured', () => {
    expect(edgeRelayAvailable()).toBe(true);
    // Numbering continues after that language's Google speakers: yue #1 → #2,
    // zh #1–#2 → #3, ja #1 → #2, en #1–#5 → #6.
    const nextN: Record<(typeof LOCALES)[number], number> = { yue: 2, zh: 3, ja: 2, en: 6 };
    for (const locale of LOCALES) {
      const buttons = selectRelayVoiceButtons(locale);
      expect(buttons, locale).toHaveLength(1);
      expect(buttons[0]!.engine).toBe('edge');
      expect(buttons[0]!.edgeVoiceId, locale).toBe(EXPECTED[locale]);
      expect(buttons[0]!.n, locale).toBe(nextN[locale]);
    }
  });

  it('resolves the seeded pin to the male Edge voice, not a Google speaker', () => {
    for (const locale of LOCALES) {
      const id = edgeChoiceId(EXPECTED[locale]);
      const choice = voiceChoiceById(id);
      expect(choice, locale).toBeDefined();
      expect(choice!.engine).toBe('edge');
      expect(choice!.edgeVoiceId).toBe(EXPECTED[locale]);
      expect(choice!.deliveryGender, locale).toBe('male');
      // The gTTS handle stays the language default; it is only a fallback.
      expect(tlForChoice(locale, id), locale).toBe(choice!.tl);
      expect(pitchTierForChoice(id), locale).toBe('mid');
      expect(deliveryGenderForChoice(locale, id, 'female'), locale).toBe('male');
    }
  });

  it('renders nothing at all when the relay is cleared (static export, no relay)', () => {
    // A stored empty value is the explicit opt-out: the direct Edge socket
    // 403s this app, so there is no Edge audio without a relay.
    setTtsProxy('');
    expect(edgeRelayAvailable()).toBe(false);
    expect(selectRelayVoiceButtons()).toEqual([]);
    for (const locale of LOCALES) {
      expect(relayMaleChoicesFor(locale), locale).toEqual([]);
      expect(selectRelayVoiceButtons(locale), locale).toEqual([]);
      // Inert, not silently substituted: the id resolves to nothing, so no
      // caller can play a male-labelled button as a female gTTS speaker.
      expect(voiceChoiceById(edgeChoiceId(EXPECTED[locale])), locale).toBeUndefined();
    }
  });

  it('unknown edge ids never resolve, gate open or closed', () => {
    expect(voiceChoiceById('edge:xx-XX-NotAVoiceNeural')).toBeUndefined();
  });
});

describe('the male seeds do not widen the gTTS contract', () => {
  it('keeps the honest Google list at nine female speakers in every gate state', () => {
    for (const relay of [DEFAULT_TTS_PROXY, '']) {
      setTtsProxy(relay);
      expect(selectTtsButtons()).toHaveLength(9);
      expect(selectTtsButtons().every((b) => b.engine === 'gtts')).toBe(true);
      expect(selectTtsButtons().every((b) => b.deliveryGender === 'female')).toBe(true);
    }
  });
});

describe('the preview/greeting path never speaks a male button with gTTS', () => {
  const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');

  function fnBody(name: string, nextName: string): string {
    const start = voice.indexOf(`export function ${name}`);
    const end = voice.indexOf(nextName, start);
    return voice.slice(start, end === -1 ? undefined : end);
  }

  it('greeting skips the MP3 tier for an Edge choice', () => {
    const greet = fnBody('playVoiceGreeting', 'previewLibraryClip');
    expect(greet).toContain("const relayMale = choice?.engine === 'edge'");
    expect(greet).toContain('if (!relayMale) void speakGtts(');
    // The Edge hop is pinned to the seeded id, not the locale default.
    expect(greet).toContain('voiceId: relayEdgeVoice ?? edgeVoiceIdForTier');
    expect(greet).toMatch(/if \(neuralRetryUsed \|\| relayMale\)/);
  });

  it('preview skips the MP3 tier and resolves without hanging on a silenced Edge element', () => {
    const preview = fnBody('previewVoiceChoice', 'const TEST_LINES');
    expect(preview).toContain("const relayMale = choice?.engine === 'edge'");
    expect(preview).toContain('relayMale ? Promise.resolve() : speakGtts(');
    expect(preview).toContain('voiceId: relayEdgeVoice ?? edgeVoiceIdForTier');
    expect(preview).toMatch(/if \(neuralRetryUsed \|\| relayMale\)/);
    // A paused Edge element cannot settle speakEdge(); the race settles it.
    expect(preview).toContain('Promise.race([edgeRun, edgeSilenced])');
  });
});

describe('the picker renders the male group only when it has rows', () => {
  const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
  const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');

  it('VoicePicker groups relay male buttons under their own heading', () => {
    expect(picker).toContain('selectRelayVoiceButtons(locale)');
    expect(picker).toMatch(/maleRows\.length > 0/);
    expect(picker).toContain("t(lang, 'voiceRelayMales')");
    expect(picker).toContain('voice-relay-off');
  });

  it('select-board row appends the same gates male buttons', () => {
    expect(row).toContain('selectRelayVoiceButtons(lang)');
    expect(row).toContain('ttsButtonSpeaker(button)');
  });
});
