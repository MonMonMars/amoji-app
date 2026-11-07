// Tier A select-page buttons: shipping Edge neurals (tts-voices-catalog wire-now), one real short name
// each. A later engine is not a numbered male/female button until it has a
// real speaker id. The row renders `selectTtsButtons()` and nothing else.

import { EDGE_VOICE_BUTTONS, type VoiceGender, type VoiceLocale } from './voice-catalog';

export type TtsEngineId = 'edge';

export interface TtsButtonVoice {
  /** Edge neural short name. */
  id: string;
  engine: TtsEngineId;
  locale: VoiceLocale;
  gender: VoiceGender;
  /** Exact label, e.g. "Cantonese female 1". */
  label: string;
  /** Per-locale gender index (male 1, female 1, ...). */
  n: number;
  shipping: true;
}

/** How many Tier A buttons each language shows when the row is filtered. */
export const TIER_A_COUNTS: Record<VoiceLocale, number> = {
  yue: EDGE_VOICE_BUTTONS.filter((b) => b.locale === 'yue').length,
  zh: EDGE_VOICE_BUTTONS.filter((b) => b.locale === 'zh').length,
  ja: EDGE_VOICE_BUTTONS.filter((b) => b.locale === 'ja').length,
  en: EDGE_VOICE_BUTTONS.filter((b) => b.locale === 'en').length,
};

export const TTS_BUTTON_REGISTRY: readonly TtsButtonVoice[] = EDGE_VOICE_BUTTONS.map((button) => ({
  id: button.id,
  engine: 'edge' as const,
  locale: button.locale,
  gender: button.gender,
  label: button.label,
  n: button.n,
  shipping: true as const,
}));

/** Shipping buttons. Optional locale and/or companion gender (voicePicks.v2 floor). */
export function selectTtsButtons(
  locale?: VoiceLocale,
  gender?: VoiceGender,
): readonly TtsButtonVoice[] {
  let rows = TTS_BUTTON_REGISTRY.filter((voice) => voice.shipping);
  if (locale) rows = rows.filter((voice) => voice.locale === locale);
  if (gender) rows = rows.filter((voice) => voice.gender === gender);
  return rows;
}

export function ttsButtonById(id: string): TtsButtonVoice | undefined {
  return TTS_BUTTON_REGISTRY.find((voice) => voice.id === id);
}

/** Stable key if a later engine reuses an id. */
export function ttsButtonKey(voice: TtsButtonVoice): string {
  return `${voice.engine}:${voice.id}`;
}
