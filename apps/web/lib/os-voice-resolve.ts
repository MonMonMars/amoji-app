// Speaking a specific OS voice, and honouring a pinned one in chat.
//
// `voice.ts` already picks a browser voice by name MATRIX + gender and speaks
// through speechSynthesis. That is the right default, but it cannot express "the
// user picked Tracy for Cantonese female" — the matrix only knows preferred
// substrings, and it rotates by character so two characters with the same gender
// deliberately sound different.
//
// A pin has to beat that rotation, otherwise tapping a voice in Settings would
// not change what chat sounds like — the exact complaint that made the old
// picker dishonest. So this module owns the resolve step:
//
//   pinned name (device-local) → live SpeechSynthesisVoice → speak
//
// and it declines rather than guesses when the named voice is gone: a device
// swap or a removed language pack must fall back to the matrix, not go silent.

import type { OsVoiceGender } from './os-voice-picks';
import type { VoiceLocale } from './voice-catalog';

/** The subset of SpeechSynthesisVoice this resolver matches on. */
export interface NamedVoice {
  name: string;
  lang: string;
}

/**
 * Find `name` in `voices`, preferring an exact tag match.
 *
 * Matching is by exact name, then by the speaker key (vendor/quality suffix
 * stripped), because the same speaker can be listed as "Microsoft Tracy" or
 * "Microsoft Tracy Desktop". It refuses a name that only matches a DIFFERENT
 * locale: pinning a zh-HK voice and resolving it against a zh-CN entry would
 * play the wrong language while the UI still said Cantonese.
 */
export function resolvePinnedVoice<T extends NamedVoice>(
  voices: readonly T[],
  name: string,
  lang: string,
): T | null {
  const want = String(name || '').trim().toLowerCase();
  if (!want || !voices.length) return null;
  const wantLang = String(lang || '').replace(/_/g, '-').toLowerCase();

  const sameLang = (v: T): boolean => {
    if (!wantLang) return true;
    const tag = v.lang.replace(/_/g, '-').toLowerCase();
    return tag === wantLang || tag.startsWith(`${wantLang}-`) || wantLang.startsWith(`${tag}-`);
  };

  const exact = voices.find((v) => v.name.trim().toLowerCase() === want && sameLang(v));
  if (exact) return exact;
  // A pin that carried NO locale tag may match by name alone. A pin that DID
  // carry a tag must not: resolving a zh-CN voice for a zh-HK pin would play
  // Mandarin while the UI still said Cantonese.
  if (wantLang) return null;
  return voices.find((v) => v.name.trim().toLowerCase() === want) ?? null;
}

/**
 * The pinned voice for this language + gender, resolved against the live list.
 * Returns null when nothing is pinned, the voice is gone, or the list is empty —
 * every one of those means "use the normal matrix pick".
 */
export function resolveOsPin<T extends NamedVoice>(
  voices: readonly T[],
  pin: { name: string; lang: string } | null,
): T | null {
  if (!pin || !voices.length) return null;
  return resolvePinnedVoice(voices, pin.name, pin.lang);
}

/** Read-only health check for the UI: is this pin still real on this device? */
export function osPinStatus<T extends NamedVoice>(
  voices: readonly T[],
  pin: { name: string; lang: string } | null,
): 'none' | 'live' | 'missing' {
  if (!pin) return 'none';
  return resolveOsPin(voices, pin) ? 'live' : 'missing';
}

/** VoiceGender of the app ('female' | 'male') → the pin slot, which is the same. */
export function pinGender(gender: 'female' | 'male'): OsVoiceGender {
  return gender;
}

/** Map an app locale to the BCP-47 tag its OS voices carry. */
export function osTagFor(locale: VoiceLocale): string {
  if (locale === 'yue') return 'zh-HK';
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'ja') return 'ja-JP';
  return 'en-US';
}
