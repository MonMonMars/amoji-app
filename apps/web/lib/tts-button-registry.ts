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
  voiceChoicesFor,
  type VoiceChoice,
} from './voice-capability';

export type TtsEngineId = 'gtts';

export interface TtsButtonVoice {
  /** Choice id, e.g. 'gtts:en-GB:f'. */
  id: string;
  engine: TtsEngineId;
  locale: VoiceLocale;
  /** Google Translate `tl` — the actual speaker selector. */
  tl: string;
  deliveryGender: 'female' | 'male';
  /** Localized region label key, e.g. voiceRegionUk. */
  labelKey: VoiceChoice['labelKey'];
  /** Per-language index, 1-based. */
  n: number;
  shipping: true;
}

function toButton(choice: VoiceChoice): TtsButtonVoice {
  return {
    id: choice.id,
    engine: 'gtts' as const,
    locale: choice.locale,
    tl: choice.tl,
    deliveryGender: choice.deliveryGender,
    labelKey: choice.labelKey,
    n: choice.n,
    shipping: true as const,
  };
}

/** Shipping buttons only (no user-added extras). */
export const TTS_BUTTON_REGISTRY: readonly TtsButtonVoice[] = VOICE_CHOICES.filter((choice) =>
  engineIsOffered(choice.engine),
).map(toButton);

/** How many shipping free voices each language offers. */
export const TIER_A_COUNTS: Record<VoiceLocale, number> = {
  yue: distinctVoiceCount('yue'),
  zh: distinctVoiceCount('zh'),
  ja: distinctVoiceCount('ja'),
  en: distinctVoiceCount('en'),
};

/**
 * Buttons for a language (or every language when omitted).
 *
 * Female + male delivery are separate buttons on the same `tl` where Google
 * only exposes one speaker — pitch reshaping is documented in voice-capability.
 * User-added extras from the Add pool are included after shipping voices.
 */
export function selectTtsButtons(locale?: VoiceLocale): readonly TtsButtonVoice[] {
  const choices = locale ? voiceChoicesFor(locale) : [
    ...voiceChoicesFor('yue'),
    ...voiceChoicesFor('zh'),
    ...voiceChoicesFor('ja'),
    ...voiceChoicesFor('en'),
  ];
  return choices.filter((choice) => engineIsOffered(choice.engine)).map(toButton);
}

export function ttsButtonById(id: string): TtsButtonVoice | undefined {
  return selectTtsButtons().find((voice) => voice.id === id);
}

/** Stable React key. Ids are already unique. */
export function ttsButtonKey(voice: TtsButtonVoice): string {
  return `${voice.engine}:${voice.id}`;
}

/**
 * True when this language's shipping grid is only the default female+male pair
 * (one Google speaker). Used to explain a short list — extras from Add are
 * still shown when present.
 */
export function isSingleVoiceLocale(locale: VoiceLocale): boolean {
  return distinctVoiceCount(locale) <= 2;
}
