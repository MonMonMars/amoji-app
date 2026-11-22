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
import type { GttsPitchTier } from './gtts-timbre';
import {
  addNextVoiceExtra,
  extraVoiceById,
  loadVoiceExtras,
  remainingVoiceAddCount,
} from './voice-extras';

/** Selectable pitch personas for one Google speaker × gender. */
export const VOICE_PITCH_TIERS: readonly GttsPitchTier[] = ['deep', 'mid', 'bright'];

export function voiceChoiceId(
  tl: string,
  gender: 'female' | 'male',
  pitchTier: GttsPitchTier,
): string {
  return `gtts:${tl}:${gender === 'male' ? 'm' : 'f'}:${pitchTier}`;
}

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
      'GET translate.google.com/translate_tts with client=tw-ob answers 200 audio/mpeg. Voice is chosen by `tl` only; voice/name/speaker params return byte-identical audio. CAVEAT (measured in a browser 2026-11-23): the SAME url returns 404 text/html as soon as a `Referer` is present, identically for yue/zh-CN/zh-HK/ja/en-US, so every browser that sends one with a media load (desktop Chrome/Edge/Firefox, Android Chrome) gets MediaError 4. The audition path therefore must end in the device voice (lib/voice-audition.ts); gTTS stays the first hop for Safari and for a user-supplied proxy.',
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
    evidence:
      'Apache-2.0 weights and a runtime are not in this repo. No keyless CORS-reachable yue endpoint; HF inference needs a key and is not browser-CORS for live TTS.',
  },
  {
    engine: 'piper',
    status: 'not-bundled',
    locales: ['en', 'zh', 'ja'],
    evidence:
      'ONNX voices are not in this repo and nothing downloads them. Piper has no verified free keyless Cantonese (yue) voice reachable from the browser without a host.',
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
  /** Stable pin/picker id (`gtts:<tl>:<f|m>:<deep|mid|bright>`). */
  id: string;
  locale: VoiceLocale;
  engine: 'gtts';
  /**
   * Google Translate `tl`. This is the ONLY handle on the voice: the endpoint
   * has no voice-id parameter, so the region code IS the speaker.
   */
  tl: string;
  /**
   * Free-tier gender timbre: gTTS has no male/female knob per `tl`, so we
   * reshape pitch client-side (honest in the UI — same speaker, different
   * delivery). Real OS voices in Settings stay a separate source.
   */
  deliveryGender: 'female' | 'male';
  /**
   * Selectable pitch persona for this same Google speaker. One base voice
   * ships as three buttons (deep / mid / bright) so characters can pick
   * distinct colour without a different `tl`.
   */
  pitchTier: GttsPitchTier;
  /** Localized region label, e.g. "UK English". */
  labelKey: StrKey;
  /** 1-based position inside the language. */
  n: number;
}

interface VoiceSeed {
  locale: VoiceLocale;
  tl: string;
  deliveryGender: 'female' | 'male';
  labelKey: StrKey;
}

/**
 * Distinct Google `tl` speakers × female/male, measured with four sentences:
 *
 *   en  → {en-US, en-PH, en-CA} {en-GB, en-IE, en-ZA, en-SG, en-HK,
 *          en-KE, en-TZ} {en-AU, en-NZ} {en-IN} {en-NG}
 *   zh  → {zh-CN, zh-HK, zh} {zh-TW}
 *   ja  → {ja, ja-JP}
 *   yue → {yue} and the Mandarin buckets, which mispronounce Cantonese
 *
 * Each seed expands to deep/mid/bright pitch buttons (same `tl`, different
 * playbackRate). Extra same-bucket regional codes live in `voice-extras.ts`
 * and only appear after the user taps Add.
 */
const VOICE_SEEDS: readonly VoiceSeed[] = [
  { locale: 'yue', tl: 'yue', deliveryGender: 'female', labelKey: 'voiceRegionCantonese' },
  { locale: 'yue', tl: 'yue', deliveryGender: 'male', labelKey: 'voiceRegionCantonese' },

  { locale: 'zh', tl: 'zh-CN', deliveryGender: 'female', labelKey: 'voiceRegionMandarin' },
  { locale: 'zh', tl: 'zh-CN', deliveryGender: 'male', labelKey: 'voiceRegionMandarin' },
  { locale: 'zh', tl: 'zh-TW', deliveryGender: 'female', labelKey: 'voiceRegionTaiwan' },
  { locale: 'zh', tl: 'zh-TW', deliveryGender: 'male', labelKey: 'voiceRegionTaiwan' },

  { locale: 'ja', tl: 'ja', deliveryGender: 'female', labelKey: 'voiceRegionJapanese' },
  { locale: 'ja', tl: 'ja', deliveryGender: 'male', labelKey: 'voiceRegionJapanese' },

  { locale: 'en', tl: 'en-US', deliveryGender: 'female', labelKey: 'voiceRegionUs' },
  { locale: 'en', tl: 'en-US', deliveryGender: 'male', labelKey: 'voiceRegionUs' },
  { locale: 'en', tl: 'en-GB', deliveryGender: 'female', labelKey: 'voiceRegionUk' },
  { locale: 'en', tl: 'en-GB', deliveryGender: 'male', labelKey: 'voiceRegionUk' },
  { locale: 'en', tl: 'en-AU', deliveryGender: 'female', labelKey: 'voiceRegionAu' },
  { locale: 'en', tl: 'en-AU', deliveryGender: 'male', labelKey: 'voiceRegionAu' },
  { locale: 'en', tl: 'en-IN', deliveryGender: 'female', labelKey: 'voiceRegionIn' },
  { locale: 'en', tl: 'en-IN', deliveryGender: 'male', labelKey: 'voiceRegionIn' },
  { locale: 'en', tl: 'en-NG', deliveryGender: 'female', labelKey: 'voiceRegionNg' },
  { locale: 'en', tl: 'en-NG', deliveryGender: 'male', labelKey: 'voiceRegionNg' },
];

function expandSeeds(seeds: readonly VoiceSeed[]): VoiceChoice[] {
  const counts: Partial<Record<VoiceLocale, number>> = {};
  const out: VoiceChoice[] = [];
  for (const seed of seeds) {
    for (const pitchTier of VOICE_PITCH_TIERS) {
      const n = (counts[seed.locale] ?? 0) + 1;
      counts[seed.locale] = n;
      out.push({
        id: voiceChoiceId(seed.tl, seed.deliveryGender, pitchTier),
        locale: seed.locale,
        engine: 'gtts',
        tl: seed.tl,
        deliveryGender: seed.deliveryGender,
        pitchTier,
        labelKey: seed.labelKey,
        n,
      });
    }
  }
  return out;
}

export const VOICE_CHOICES: readonly VoiceChoice[] = expandSeeds(VOICE_SEEDS);

/** Maps older pins (no gender and/or no pitch suffix) onto mid-tier ids. */
function buildLegacyVoiceChoiceIds(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const seed of VOICE_SEEDS) {
    const mid = voiceChoiceId(seed.tl, seed.deliveryGender, 'mid');
    const genderOnly = `gtts:${seed.tl}:${seed.deliveryGender === 'male' ? 'm' : 'f'}`;
    map[genderOnly] = mid;
    if (seed.deliveryGender === 'female') {
      map[`gtts:${seed.tl}`] = mid;
    }
  }
  return map;
}

export const LEGACY_VOICE_CHOICE_IDS: Readonly<Record<string, string>> = buildLegacyVoiceChoiceIds();

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

/** Ids that always ship — extras must not collide with these. */
export const SHIPPING_VOICE_IDS: ReadonlySet<string> = new Set(VOICE_CHOICES.map((c) => c.id));

export function allVoiceChoices(): readonly VoiceChoice[] {
  return [...VOICE_CHOICES, ...loadVoiceExtras(SHIPPING_VOICE_IDS)];
}

export function voiceChoicesFor(locale: VoiceLocale): readonly VoiceChoice[] {
  return allVoiceChoices().filter((c) => c.locale === locale);
}

/** Shipping-only choices (no user-added extras). */
export function shippingVoiceChoicesFor(locale: VoiceLocale): readonly VoiceChoice[] {
  return VOICE_CHOICES.filter((c) => c.locale === locale);
}

export function resolveVoiceChoiceId(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return LEGACY_VOICE_CHOICE_IDS[id] ?? id;
}

export function voiceChoiceById(id: string | null | undefined): VoiceChoice | undefined {
  const resolved = resolveVoiceChoiceId(id);
  if (!resolved) return undefined;
  return VOICE_CHOICES.find((c) => c.id === resolved)
    ?? extraVoiceById(resolved, SHIPPING_VOICE_IDS);
}

/** How many Add-pool voices are still available for this language. */
export function voiceAddRemaining(locale: VoiceLocale): number {
  return remainingVoiceAddCount(locale, SHIPPING_VOICE_IDS);
}

/** Append the next test voice from the Add pool. Null when exhausted. */
export function addVoiceOption(locale: VoiceLocale): VoiceChoice | null {
  return addNextVoiceExtra(locale, SHIPPING_VOICE_IDS, shippingVoiceChoicesFor(locale).length);
}

/**
 * Pitch gender for the free HTTP tier.
 * An explicit pinned/tapped choice wins; otherwise use the companion gender
 * fallback — never the catalog's first (female) button, which made every
 * male companion and unpinned lang sound (or fail) like Yue female only.
 */
export function deliveryGenderForChoice(
  locale: VoiceLocale,
  choiceId?: string | null,
  fallback: 'female' | 'male' = 'female',
): 'female' | 'male' {
  const pinned = voiceChoiceById(choiceId);
  if (pinned && pinned.locale === locale) return pinned.deliveryGender;
  return fallback === 'male' || fallback === 'female' ? fallback : 'female';
}

/** Prefer mid-tier shipping voice matching the companion gender. */
export function preferredVoiceChoiceForGender(
  locale: VoiceLocale,
  gender: 'female' | 'male',
): VoiceChoice {
  const choices = voiceChoicesFor(locale);
  return choices.find((c) => c.deliveryGender === gender && c.pitchTier === 'mid')
    ?? choices.find((c) => c.deliveryGender === gender)
    ?? choices[0]
    ?? VOICE_CHOICES[0]!;
}

/** The default button for a language (first female mid when present). */
export function defaultVoiceChoice(locale: VoiceLocale): VoiceChoice {
  return preferredVoiceChoiceForGender(locale, 'female');
}

/** Pitch persona on a pinned/tapped voice button, if any. */
export function pitchTierForChoice(id?: string | null): GttsPitchTier | undefined {
  return voiceChoiceById(id)?.pitchTier;
}

/** Localized label key for a pitch persona button. */
export function pitchTierLabelKey(tier: GttsPitchTier): StrKey {
  if (tier === 'deep') return 'voicePitchDeep';
  if (tier === 'bright') return 'voicePitchBright';
  return 'voicePitchMid';
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

/** How many shipping free voices this language lists (excludes user Add extras). */
export function distinctVoiceCount(locale: VoiceLocale): number {
  return shippingVoiceChoicesFor(locale).length;
}

/** How many distinct Google `tl` speakers this language ships (ignores pitch). */
export function distinctSpeakerCount(locale: VoiceLocale): number {
  return new Set(shippingVoiceChoicesFor(locale).map((c) => c.tl)).size;
}

/** Shipping gTTS buttons that pass the engine audit (`works` only). */
export function playableShippingChoicesFor(locale: VoiceLocale): readonly VoiceChoice[] {
  return shippingVoiceChoicesFor(locale).filter((c) => engineIsOffered(c.engine));
}

export interface LocalePlayableGenderCounts {
  locale: VoiceLocale;
  female: number;
  male: number;
}

/** Distinct playable picker buttons per delivery gender (all pitch tiers). */
export function localePlayableGenderCounts(locale: VoiceLocale): LocalePlayableGenderCounts {
  const playable = playableShippingChoicesFor(locale);
  return {
    locale,
    female: playable.filter((c) => c.deliveryGender === 'female').length,
    male: playable.filter((c) => c.deliveryGender === 'male').length,
  };
}

export function localeHasPlayableBothGenders(locale: VoiceLocale): boolean {
  const row = localePlayableGenderCounts(locale);
  return row.female > 0 && row.male > 0;
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
