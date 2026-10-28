// Select-page TTS buttons. The row renders `selectTtsButtons()` only.
// A later PR adds free engines by appending rows to TTS_BUTTON_REGISTRY.
// Set shipping: true only when that engine can actually speak. The button
// row does not branch on the engine name, so new engines do not need a new
// layout. Non-shipping notes live in FUTURE_TTS_ENGINES and stay off the row.
// This PR fills the row with the Edge neural voices already in the repo.

import { EDGE_VOICE_BUTTONS, type VoiceGender, type VoiceLocale } from './voice-catalog';

export type TtsEngineId = 'edge' | (string & {});

export interface TtsButtonVoice {
  /** Engine voice id. Edge uses the neural short name. */
  id: string;
  engine: TtsEngineId;
  locale: VoiceLocale;
  gender: VoiceGender;
  /** Small-button text, e.g. "cantonese female 1". */
  label: string;
  /** Visible and selectable. False keeps a stub out of the row. */
  shipping: boolean;
}

const LANGUAGE_LABEL: Record<VoiceLocale, string> = {
  yue: 'cantonese',
  zh: 'mandarin',
  ja: 'japanese',
  en: 'english',
};

/**
 * Engines a follow-up can drop into TTS_BUTTON_REGISTRY without redesigning
 * the select row. Weights are not bundled, so nothing here is shipping.
 */
export const FUTURE_TTS_ENGINES: readonly { engine: string; note: string }[] = [
  { engine: 'kokoro', note: 'Append shipping TtsButtonVoice rows when playback is wired.' },
  { engine: 'piper', note: 'Same small-button row. No new card layout.' },
  { engine: 'melotts', note: 'Same small-button row. No new card layout.' },
  { engine: 'bark', note: 'Same small-button row. No new card layout.' },
  { engine: 'canto-nano', note: 'Yue only, once a local build exists.' },
];

export const TTS_BUTTON_REGISTRY: readonly TtsButtonVoice[] = EDGE_VOICE_BUTTONS.map((button) => ({
  id: button.id,
  engine: 'edge' as const,
  locale: button.locale,
  gender: button.gender,
  label: `${LANGUAGE_LABEL[button.locale]} ${button.gender} ${button.n}`,
  shipping: true,
}));

/** Buttons drawn on the select page, in registry order. */
export function selectTtsButtons(): readonly TtsButtonVoice[] {
  return TTS_BUTTON_REGISTRY.filter((voice) => voice.shipping);
}

export function ttsButtonById(id: string): TtsButtonVoice | undefined {
  return TTS_BUTTON_REGISTRY.find((voice) => voice.id === id);
}

/** Stable key if a later engine reuses an id. */
export function ttsButtonKey(voice: TtsButtonVoice): string {
  return `${voice.engine}:${voice.id}`;
}
