// A male voice choice must always be able to produce a male sound — or be
// reported as unavailable. Never a woman's voice, never silence.
//
// Owner report 2026-11-26: "still no male voice. the button is here, but no
// voice out." The Edge relay itself is healthy (a verified UTF-8 POST returns
// 200 audio/mpeg), so the defect was the CHAT hop chain:
//
//   freeVoiceHops(locale, { preferMale: true }) = edge → synth → gtts
//
// (1) `voice-capability.allRelayMaleChoices()` was gated on
//     `edgeRelayAvailable()`, which includes the 5-minute endpoint breaker.
//     While the breaker was open the male pin resolved to NOTHING, so
//     `deliveryGenderForChoice()` fell back to the companion's gender — a male
//     pin could become a woman's voice, and `voice-picks.sanitize()` erased the
//     pin for the rest of the session.
// (2) In chat on Windows the mic play-and-record latch is active and the male
//     chain deliberately SKIPPED the device voice ("often lands on earpiece /
//     BT"). With Edge gated off the only remaining hop was gTTS — one female
//     speaker per `tl`, Referer-blocked in desktop Chrome — so the line went
//     completely silent. The female chain never skips synth, which is why
//     female voices still spoke.
//
// This module is the single answer to "can this male choice speak, and with
// what?" It reuses the existing availability notions (`edgeRelayAvailable()`
// for a live relay, `inferVoiceGender()` / `matchVoiceLocale()` for the OS
// voice) instead of inventing new capability checks.

import type { VoiceLocale } from './voice-catalog';
import { browserVoiceGender, edgeVoiceIdForTier, type EdgePitchTier } from './voice-catalog';
import { matchVoiceLocale } from './browser-voices';
import {
  RELAY_MALE_SEEDS,
  edgeRelayAvailable,
  relayMaleChoiceById,
} from './voice-capability';

export type MaleRouteKind = 'edge' | 'device' | 'unavailable';

export interface MaleVoiceRoute {
  kind: MaleRouteKind;
  /** The Edge neural id this locale's male choice names (always known). */
  edgeVoiceId: string | null;
  /** The installed OS voice that would speak it, or null. */
  deviceVoiceName: string | null;
  /** Human-readable why, for `reportVoiceStatus` and the picker hint. */
  reason: string;
}

export interface MaleRouteInput {
  /** Edge can play RIGHT NOW: relay configured AND breaker closed. */
  edgeAvailable: boolean;
  /**
   * Raw `speechSynthesis.getVoices()` output, or `null` when the API is absent
   * (SSR, Node, a browser with speech disabled). `null` means "unknown", not
   * "none": the platform may still have a voice.
   */
  deviceVoices?: ReadonlyArray<{ name: string; lang: string }> | null;
}

/** The Edge neural id this app ships for a locale's one male button. */
export function maleEdgeVoiceIdFor(locale: VoiceLocale): string | null {
  return RELAY_MALE_SEEDS.find((seed) => seed.locale === locale)?.edgeVoiceId ?? null;
}

/**
 * The installed OS voice that can read this locale as a man, or null.
 * Native locale only: a Mandarin voice reading Cantonese is a different
 * speaker, not a Cantonese male. The gender predicate is the SAME one
 * `pickVoice()` uses for chat (`browserVoiceGender`), so the picker cannot
 * disable a voice that chat would actually play.
 */
export function maleDeviceVoiceName(
  locale: VoiceLocale,
  voices: ReadonlyArray<{ name: string; lang: string }> | null | undefined,
): string | null {
  if (!voices) return null;
  for (const voice of voices) {
    if (matchVoiceLocale(voice.lang, locale) !== 'native') continue;
    if (browserVoiceGender(voice.name) === 'male') return voice.name;
  }
  return null;
}

/** Read the live device voice list, distinguishing "absent" from "empty". */
export function currentDeviceVoices(): ReadonlyArray<{ name: string; lang: string }> | null {
  const g = globalThis as { speechSynthesis?: { getVoices?: () => unknown } };
  const synth = g.speechSynthesis;
  if (!synth || typeof synth.getVoices !== 'function') return null;
  try {
    const list = synth.getVoices();
    return Array.isArray(list) ? (list as Array<{ name: string; lang: string }>) : [];
  } catch {
    return null;
  }
}

/**
 * Decide the male hop: Edge neural, the device voice, or unavailable.
 *
 * A list that exists but has no male voice for the locale is a real "none";
 * an absent API is "unknown" and keeps the device hop, because the platform
 * may still speak through `lang` (Android/Safari populate late).
 */
export function maleVoiceRoute(locale: VoiceLocale, input: MaleRouteInput): MaleVoiceRoute {
  const edgeVoiceId = maleEdgeVoiceIdFor(locale);
  const deviceVoiceName = maleDeviceVoiceName(locale, input.deviceVoices);
  if (input.edgeAvailable) {
    return { kind: 'edge', edgeVoiceId, deviceVoiceName, reason: 'relay reachable · male neural voice' };
  }
  if (deviceVoiceName) {
    return { kind: 'device', edgeVoiceId, deviceVoiceName, reason: `device male voice · ${deviceVoiceName}` };
  }
  if (input.deviceVoices == null || input.deviceVoices.length === 0) {
    // The API is missing or the list has not populated yet, so we cannot prove
    // there is no male voice. Keep the hop: `synthSpeak` sets `lang` and lets
    // the platform choose (Chrome fires `voiceschanged` after first speak).
    return { kind: 'device', edgeVoiceId, deviceVoiceName: null, reason: 'device voice list not ready — platform chooses' };
  }
  return { kind: 'unavailable', edgeVoiceId, deviceVoiceName: null, reason: 'no relay and no male device voice' };
}

/** What the picker should say when the male button cannot speak at all. */
export function maleChoiceUnavailableReason(
  locale: VoiceLocale,
  voices: ReadonlyArray<{ name: string; lang: string }> | null | undefined = currentDeviceVoices(),
): string | null {
  const route = maleVoiceRoute(locale, { edgeAvailable: edgeRelayAvailable(), deviceVoices: voices });
  return route.kind === 'unavailable' ? route.reason : null;
}

/**
 * Edge id the CHAT path must use for this line.
 *
 * Greeting and preview already thread the tapped choice's `edgeVoiceId`
 * explicitly. Chat used to rely on `edgeVoiceIdForTier(lang, spokenGender,
 * pitchTier)`, which is correct only while the pin still resolves; this reads
 * the pin's own id first (breaker-independent) so a male pin can never be
 * derived into a female tier voice.
 */
export function chatMaleEdgeVoiceId(
  locale: VoiceLocale,
  choiceId: string | null | undefined,
  deliveryGender: 'female' | 'male',
  tier: EdgePitchTier | null | undefined,
): string {
  if (deliveryGender === 'male') {
    const pinned = relayMaleChoiceById(choiceId);
    if (pinned && pinned.locale === locale && pinned.edgeVoiceId) return pinned.edgeVoiceId;
    const seed = maleEdgeVoiceIdFor(locale);
    if (seed) return seed;
    return edgeVoiceIdForTier(locale, 'male', tier);
  }
  return edgeVoiceIdForTier(locale, deliveryGender, tier);
}
