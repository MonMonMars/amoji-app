// The voice buttons the UI is allowed to render.
//
// This registry used to be built from a list of 58 Edge neural short names.
// Every one of them produced the SAME audio, because the Edge read-aloud
// endpoint refuses this app's client token and each tap fell through to the
// Google Translate MP3 tier, which selects a speaker with `tl` and has no
// voice-id parameter at all. Fifty-eight buttons, one sound.
//
// So the registry is now built from the voices that actually differ, and it is
// gated on the engine audit in voice-capability.ts: an engine whose status is
// not 'works' cannot become a button at all. That gate, not a comment, is what
// keeps a dead engine from reappearing here.

import type { VoiceLocale } from './voice-catalog';
import {
  VOICE_CHOICES,
  distinctVoiceCount,
  engineIsOffered,
  type VoiceChoice,
} from './voice-capability';

export type TtsEngineId = 'gtts';

export interface TtsButtonVoice {
  /** Choice id, e.g. 'gtts:en-GB'. */
  id: string;
  engine: TtsEngineId;
  locale: VoiceLocale;
  /** Google Translate `tl` — the actual speaker selector. */
  tl: string;
  /** Localized region label key, e.g. voiceRegionUk. */
  labelKey: VoiceChoice['labelKey'];
  /** Per-language index, 1-based. */
  n: number;
  shipping: true;
}

export const TTS_BUTTON_REGISTRY: readonly TtsButtonVoice[] = VOICE_CHOICES.filter((choice) =>
  engineIsOffered(choice.engine),
).map((choice) => ({
  id: choice.id,
  engine: 'gtts' as const,
  locale: choice.locale,
  tl: choice.tl,
  labelKey: choice.labelKey,
  n: choice.n,
  shipping: true as const,
}));

/** How many genuinely different sounds each language offers. */
export const TIER_A_COUNTS: Record<VoiceLocale, number> = {
  yue: distinctVoiceCount('yue'),
  zh: distinctVoiceCount('zh'),
  ja: distinctVoiceCount('ja'),
  en: distinctVoiceCount('en'),
};

/**
 * Buttons for a language (or every language when omitted).
 *
 * There is no gender filter any more. The live voices are not gendered — a
 * language has one or a few distinct speakers — so a male/female split would
 * invent a distinction the audio does not have. Gender still shapes a
 * character's delivery through pitch, but it is not a voice choice.
 */
export function selectTtsButtons(locale?: VoiceLocale): readonly TtsButtonVoice[] {
  if (!locale) return TTS_BUTTON_REGISTRY;
  return TTS_BUTTON_REGISTRY.filter((voice) => voice.locale === locale);
}

export function ttsButtonById(id: string): TtsButtonVoice | undefined {
  return TTS_BUTTON_REGISTRY.find((voice) => voice.id === id);
}

/** Stable React key. Ids are already unique. */
export function ttsButtonKey(voice: TtsButtonVoice): string {
  return `${voice.engine}:${voice.id}`;
}

/**
 * True when this language offers a single voice, i.e. the row is one button and
 * the UI should say why rather than look broken.
 */
export function isSingleVoiceLocale(locale: VoiceLocale): boolean {
  return selectTtsButtons(locale).length <= 1;
}
