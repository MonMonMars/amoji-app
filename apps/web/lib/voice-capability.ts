// What the voice picker is allowed to offer.
//
// The picker used to render 58 "Edge neural" buttons per language plus a grid
// of engines that were never bundled. Every one of those buttons played the
// SAME audio: the Edge read-aloud endpoint refuses this app's client token, so
// each tap fell through to the Google Translate MP3 tier, which accepts only a
// language code (`tl`) and has no voice-id parameter at all. Ten buttons, one
// sound — exactly what got reported.
//
// So this module answers one question honestly: which engines can produce a
// DIFFERENT sound on this device today? Nothing is listed here on faith; each
// verdict below names the check that produced it.
//
// The one live free engine is Google Translate's `translate_tts` endpoint. It
// has no voice parameter, but it DOES have genuinely different voices behind
// different `tl` codes — different speakers, not just a different rate. Those
// are the only real choices left, so they are the only buttons.

import type { StrKey } from './prefs';
import type { VoiceLocale } from './voice-catalog';

export type EngineStatus =
  /** Reachable now and produces its own voice. */
  | 'works'
  /** Endpoint refuses this app, so picking it silently yields a fallback. */
  | 'dead'
  /** Catalogued but no weights/runtime in this repo — nothing can play. */
  | 'not-bundled'
  /** speechSynthesis: real OS voices on desktop, muted by the iOS silent switch. */
  | 'browser'
  /** Works, but only after the user supplies their own key/URL in Settings. */
  | 'gated';

export interface EngineVerdict {
  engine: string;
  status: EngineStatus;
  /** How this was established, so the next reader does not have to re-probe. */
  evidence: string;
  /** Which languages it could speak. */
  locales: readonly VoiceLocale[];
}

export const ALL_LOCALES: readonly VoiceLocale[] = ['yue', 'zh', 'ja', 'en'];

/**
 * The audit. `probe-voices` and `probe-edge` under `scripts/` re-run the two
 * network checks; everything else is decided by what is committed here.
 */
export const ENGINE_VERDICTS: readonly EngineVerdict[] = [
  {
    engine: 'gtts',
    status: 'works',
    locales: ALL_LOCALES,
    evidence:
      'GET translate.google.com/translate_tts with client=tw-ob answers 200 audio/mpeg. Voice is chosen by `tl` only; voice/name/speaker params return byte-identical audio.',
  },
  {
    engine: 'edge',
    status: 'dead',
    locales: ALL_LOCALES,
    evidence:
      'readaloud WSS upgrade answers 403 with the published client token and Sec-MS-GEC, 401 without it. voices/list still 200s, so only synthesis is refused. 58 catalog buttons all collapsed here.',
  },
  {
    engine: 'speech',
    status: 'browser',
    locales: ALL_LOCALES,
    evidence:
      'speechSynthesis: distinct installed OS voices on desktop; muted by the iOS hardware silent switch and empty on some devices, which is why it is the last hop.',
  },
  {
    engine: 'openai',
    status: 'gated',
    locales: ALL_LOCALES,
    evidence:
      'gpt-4o-mini-tts with coral/marin/shimmer/ash/alloy/echo. Needs a user key plus a relay (api.openai.com refuses browser CORS). Off by default.',
  },
  {
    engine: 'kokoro',
    status: 'not-bundled',
    locales: ['en', 'zh'],
    evidence: 'Apache-2.0 weights and a runtime are not in this repo.',
  },
  {
    engine: 'piper',
    status: 'not-bundled',
    locales: ['en', 'zh', 'ja'],
    evidence: 'ONNX voices are not in this repo and nothing downloads them.',
  },
  {
    engine: 'melotts',
    status: 'not-bundled',
    locales: ['en', 'zh', 'ja'],
    evidence: 'No weights, no Python runtime in the web bundle.',
  },
  {
    engine: 'bark',
    status: 'not-bundled',
    locales: ['en'],
    evidence: 'Too slow for live use even when hosted; not in this repo.',
  },
  {
    engine: 'canto-nano',
    status: 'not-bundled',
    locales: ['yue'],
    evidence: 'cantoNanoAvailable() is hard-coded false; speakCantoNano() rejects.',
  },
  {
    engine: 'silencio2',
    status: 'not-bundled',
    locales: ['en'],
    evidence: 'EN-only CPU sidecar stub for /en-sfx-ab. Not bundled, flag default off.',
  },
  {
    engine: 'chatterbox-turbo',
    status: 'not-bundled',
    locales: ['en'],
    evidence: 'EN-only CPU sidecar stub for /en-sfx-ab. Not bundled, flag default off.',
  },
  {
    engine: 'vui-nano',
    status: 'not-bundled',
    locales: ['en'],
    evidence: 'EN-only CPU sidecar stub for /en-sfx-ab. Not bundled, flag default off.',
  },
  {
    engine: 'lure-tts',
    status: 'not-bundled',
    locales: ['en'],
    evidence: 'EN-only optional sidecar stub. Not bundled; may SKIP even when hosted.',
  },
];

const BY_ENGINE = new Map(ENGINE_VERDICTS.map((v) => [v.engine, v]));

export function engineStatus(engine: string): EngineStatus | null {
  return BY_ENGINE.get(engine)?.status ?? null;
}

/** Engines that may be offered as a button right now. */
export function engineIsOffered(engine: string): boolean {
  return engineStatus(engine) === 'works';
}

/**
 * Engines that are catalogued but cannot be a button. Exported so the UI can
 * say why the list is short instead of just showing fewer things.
 */
export function hiddenEngines(): readonly EngineVerdict[] {
  return ENGINE_VERDICTS.filter((v) => v.status !== 'works');
}

// ---------------------------------------------------------------------------
// Real, audibly distinct voices.
// ---------------------------------------------------------------------------

export interface VoiceChoice {
  /** Stable pin/picker id. */
  id: string;
  locale: VoiceLocale;
  engine: 'gtts';
  /**
   * Google Translate `tl`. This is the ONLY handle on the voice: the endpoint
   * has no voice-id parameter, so the region code IS the speaker.
   */
  tl: string;
  /** Localized region label, e.g. "UK English". */
  labelKey: StrKey;
  /** 1-based position inside the language. */
  n: number;
}

/**
 * Grouped by measuring the response for four fixed sentences per `tl` and
 * bucketing codes whose byte lengths matched on ALL four. Codes in the same
 * bucket are the same speaker:
 *
 *   en  → {en-US, en-PH, en-CA} {en-GB, en-IE, en-ZA, en-SG, en-HK,
 *          en-KE, en-TZ} {en-AU, en-NZ} {en-IN} {en-NG}
 *   zh  → {zh-CN, zh-HK, zh} {zh-TW}
 *   ja  → {ja, ja-JP}
 *   yue → {yue} and the Mandarin buckets, which mispronounce Cantonese
 *
 * One representative per bucket is offered. That is 5 + 2 + 1 + 1 buttons, all
 * of which provably sound different from each other, instead of 58 that do not.
 */
export const VOICE_CHOICES: readonly VoiceChoice[] = [
  { id: 'gtts:yue', locale: 'yue', engine: 'gtts', tl: 'yue', labelKey: 'voiceRegionCantonese', n: 1 },

  { id: 'gtts:zh-CN', locale: 'zh', engine: 'gtts', tl: 'zh-CN', labelKey: 'voiceRegionMandarin', n: 1 },
  { id: 'gtts:zh-TW', locale: 'zh', engine: 'gtts', tl: 'zh-TW', labelKey: 'voiceRegionTaiwan', n: 2 },

  { id: 'gtts:ja', locale: 'ja', engine: 'gtts', tl: 'ja', labelKey: 'voiceRegionJapanese', n: 1 },

  { id: 'gtts:en-US', locale: 'en', engine: 'gtts', tl: 'en-US', labelKey: 'voiceRegionUs', n: 1 },
  { id: 'gtts:en-GB', locale: 'en', engine: 'gtts', tl: 'en-GB', labelKey: 'voiceRegionUk', n: 2 },
  { id: 'gtts:en-AU', locale: 'en', engine: 'gtts', tl: 'en-AU', labelKey: 'voiceRegionAu', n: 3 },
  { id: 'gtts:en-IN', locale: 'en', engine: 'gtts', tl: 'en-IN', labelKey: 'voiceRegionIn', n: 4 },
  { id: 'gtts:en-NG', locale: 'en', engine: 'gtts', tl: 'en-NG', labelKey: 'voiceRegionNg', n: 5 },
];

/** Fallback `tl` per language when nothing is pinned. */
const DEFAULT_TL: Record<VoiceLocale, string> = {
  yue: 'yue',
  zh: 'zh-CN',
  ja: 'ja',
  en: 'en-US',
};

export function isVoiceLocale(v: string): v is VoiceLocale {
  return v === 'yue' || v === 'zh' || v === 'ja' || v === 'en';
}

export function allVoiceChoices(): readonly VoiceChoice[] {
  return VOICE_CHOICES;
}

export function voiceChoicesFor(locale: VoiceLocale): readonly VoiceChoice[] {
  return VOICE_CHOICES.filter((c) => c.locale === locale);
}

export function voiceChoiceById(id: string | null | undefined): VoiceChoice | undefined {
  if (!id) return undefined;
  return VOICE_CHOICES.find((c) => c.id === id);
}

/** The default button for a language (the first, in catalog order). */
export function defaultVoiceChoice(locale: VoiceLocale): VoiceChoice {
  return voiceChoicesFor(locale)[0] ?? VOICE_CHOICES[0]!;
}

/**
 * `tl` to actually request. An unknown/unpinned id falls back to that
 * language's default rather than to a different language's voice.
 */
export function tlForChoice(locale: VoiceLocale, id?: string | null): string {
  const hit = voiceChoiceById(id);
  if (hit && hit.locale === locale) return hit.tl;
  return DEFAULT_TL[locale];
}

/** How many genuinely different sounds this language can produce. */
export function distinctVoiceCount(locale: VoiceLocale): number {
  return voiceChoicesFor(locale).length;
}

// ---------------------------------------------------------------------------
// OS voices: a SECOND source, when the device really has more speakers.
// ---------------------------------------------------------------------------

/**
 * The gtts list above is the only HOSTED engine that works, and it tops out at
 * one or two speakers per language. speechSynthesis is the other live source,
 * and on Windows/macOS it exposes genuinely different installed voices — three
 * or more per gender for some languages.
 *
 * So it is declared here as a supplementary source rather than folded into
 * VOICE_CHOICES: those ids are Google `tl` codes, and an OS voice is not one.
 * `lib/browser-voices.ts` enumerates what this device actually has and infers
 * each voice's gender from its name; this block only states the policy, so the
 * picker can ask "is it worth showing OS voices at all?" without importing the
 * enumeration.
 */

export interface OsSourceVerdict {
  /** Can be a button when the device reports usable voices. */
  status: 'browser';
  /** Why it is not a button today, in the same shape as the audit above. */
  evidence: string;
  /**
   * Usable voices per inferred gender a language must reach before the picker
   * offers this source instead of just explaining its absence.
   */
  minPerGender: number;
}

export const OS_VOICE_SOURCE: OsSourceVerdict = {
  status: 'browser',
  minPerGender: 2,
  evidence:
    'speechSynthesis.getVoices(): installed OS voices, verified as 15 local voices in Chrome, Edge and bundled Chromium on Windows 11 (zh-HK Danny male + Tracy female; ja-JP Ayumi/Haruka/Sayaka female + Ichiro male). SpeechSynthesisVoice has no gender field, so gender is inferred from the name by lib/browser-voices.ts. Muted entirely by the iOS silent switch; on iOS and Android only one voice per language actually plays.',
};

/**
 * Should the picker show OS voices for this language as real choices?
 *
 * `usablePerGender` is the count from browser-voices.ts, which already excludes
 * voices the platform will silently swap out. The bar is `minPerGender` in BOTH
 * genders: one lonely extra voice is not worth a row that implies a choice.
 */
export function osVoicesAreChoosable(usablePerGender: { female: number; male: number }): boolean {
  return usablePerGender.female >= OS_VOICE_SOURCE.minPerGender
    && usablePerGender.male >= OS_VOICE_SOURCE.minPerGender;
}
