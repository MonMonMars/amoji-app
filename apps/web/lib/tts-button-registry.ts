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

import type { GttsPitchTier } from './gtts-timbre';
import type { VoiceLocale } from './voice-catalog';
import {
  VOICE_CHOICES,
  allRelayMaleChoices,
  distinctSpeakerCount,
  distinctVoiceCount,
  engineIsOffered,
  voiceChoicesFor,
  type VoiceChoice,
} from './voice-capability';

export type TtsEngineId = 'gtts';

export interface TtsButtonVoice {
  /** Choice id, e.g. 'gtts:en-GB:f:mid'. */
  id: string;
  engine: TtsEngineId;
  locale: VoiceLocale;
  /** Google Translate `tl` — the actual speaker selector. */
  tl: string;
  /** Source speaker gender (female for every gTTS code this app ships). */
  deliveryGender: 'female' | 'male';
  /** Persona; only `mid` (natural) ships now that pitch reshaping is gone. */
  pitchTier: GttsPitchTier;
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
    pitchTier: choice.pitchTier,
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
 * One button per real Google `tl` speaker. Every one is female; no pitch
 * variants and no male labels, because the MP3 is played unprocessed and the
 * endpoint has no male speaker. User-added extras from the Add pool are
 * included after shipping voices.
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

/**
 * Relay male buttons (Edge neural, gated on the TTS relay).
 *
 * Kept OUT of {@link selectTtsButtons} on purpose. That list is the honest
 * gTTS catalogue — every row is a Google `tl` speaker — and the audit tests
 * pin it to exactly those speakers. A male Edge voice is a different engine
 * with its own gate, so it gets its own selector instead of quietly widening
 * the gTTS contract. Empty whenever `edgeRelayAvailable()` is false, which is
 * what keeps a static export with no relay from showing a silent male button.
 */
export interface RelayVoiceButton extends Omit<TtsButtonVoice, 'engine' | 'tl'> {
  engine: 'edge';
  /** Edge neural short name; the actual speaker selector on the relay. */
  edgeVoiceId: string;
}

export function selectRelayVoiceButtons(locale?: VoiceLocale): readonly RelayVoiceButton[] {
  const choices = locale ? allRelayMaleChoices().filter((c) => c.locale === locale) : allRelayMaleChoices();
  return choices.map((choice) => ({
    id: choice.id,
    engine: 'edge' as const,
    locale: choice.locale,
    edgeVoiceId: choice.edgeVoiceId!,
    deliveryGender: choice.deliveryGender,
    pitchTier: choice.pitchTier,
    labelKey: choice.labelKey,
    n: choice.n,
    shipping: true as const,
  }));
}

/** Speaker label for a button: Google `tl`, or the Edge short name. */
export function ttsButtonSpeaker(voice: TtsButtonVoice | RelayVoiceButton): string {
  return voice.engine === 'edge' ? voice.edgeVoiceId : voice.tl;
}

/** Stable React key. Ids are already unique. */
export function ttsButtonKey(voice: { engine: string; id: string }): string {
  return `${voice.engine}:${voice.id}`;
}

/**
 * True when this language ships only one Google `tl` speaker (yue/ja). Used to
 * explain a short speaker list — pitch personas and Add extras still show.
 */
export function isSingleVoiceLocale(locale: VoiceLocale): boolean {
  return distinctSpeakerCount(locale) <= 1;
}
