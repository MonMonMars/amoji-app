// Tier A select-page buttons: the 28 Edge neural voices, one real short name
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
  shipping: true as const,
}));

/** Shipping buttons. Pass a locale to filter to the current language. */
export function selectTtsButtons(locale?: VoiceLocale): readonly TtsButtonVoice[] {
  const rows = TTS_BUTTON_REGISTRY.filter((voice) => voice.shipping);
  if (!locale) return rows;
  return rows.filter((voice) => voice.locale === locale);
}

export function ttsButtonById(id: string): TtsButtonVoice | undefined {
  return TTS_BUTTON_REGISTRY.find((voice) => voice.id === id);
}

/** Stable key if a later engine reuses an id. */
export function ttsButtonKey(voice: TtsButtonVoice): string {
  return `${voice.engine}:${voice.id}`;
}
