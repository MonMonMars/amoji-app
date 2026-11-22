// Can a voice-picker button actually make a sound on this device?
//
// `voice-capability.ts` decides which ENGINE may become a button at all.
// This module answers the next question: of the tiers that button will try,
// does at least one produce audio HERE? It is pure so the answer can be
// unit-tested per locale instead of being discovered by a silent phone.
//
// Why this file exists (measured 2026-11-23, browser not Node):
//
//   translate.google.com/translate_tts answers 200 audio/mpeg with no Referer
//   and 404 text/html for the SAME url once `Referer:` is present. Verified
//   identical for tl=yue, zh-CN, zh-HK, ja and en-US. A browser media load
//   always carries the page as Referer, so the gTTS hop rejects with
//   MediaError.code 4 on every language in desktop Chrome/Edge/Firefox and
//   Android Chrome. Edge read-aloud still answers 403. That leaves
//   speechSynthesis as the only tier that can speak there.
//
// The select-board / Settings audition path used to stop before synth (it
// reported "skip synth robot"), so every one of those buttons was mute while
// the chat + gate path, which ends in synth, still spoke. That is the
// "lots of voice buttons, all other voices not working" report.

export type AuditionEngine = 'gtts' | 'edge' | 'synth';

export interface AuditionCapabilities {
  /**
   * Google Translate MP3 tier. Pass false once this session has seen the
   * 404/MediaError 4 that a Referer produces; pass true on the first attempt
   * (Safari's media stack and the Edge proxy can still answer).
   */
  gtts?: boolean;
  /** Edge read-aloud has not been proven dead by its breaker. */
  edge?: boolean;
  /** `typeof speechSynthesis !== 'undefined'`. */
  synth?: boolean;
}

export interface AuditionInput extends AuditionCapabilities {
  /** Companion locale, used for the reason string only. */
  locale: string;
  /**
   * `speechSynthesis.getVoices()`. Only used to say whether the device lists
   * a voice for this language — a platform engine can still synthesize with
   * `lang` set when the list is empty (Android/Safari populate late).
   */
  voices?: readonly { lang: string }[];
}

export interface AuditionRoute {
  /** Tiers to try, in order. The last one is the terminal hop. */
  hops: readonly AuditionEngine[];
  terminal: AuditionEngine | 'none';
  /** True when at least one tier can produce audio on this device. */
  playable: boolean;
  /** Human-readable why, for the status bus and tests. */
  reason: string;
}

/** Same BCP-47 test the synth pool uses, duplicated to keep this module pure. */
function matchesLocale(voiceLang: string, locale: string): boolean {
  const tag = voiceLang.replace(/_/g, '-').toLowerCase();
  if (locale === 'yue') return tag === 'yue' || tag.startsWith('yue-') || tag === 'zh-hk' || tag.startsWith('zh-hk-');
  if (locale === 'zh') {
    return tag === 'zh-cn' || tag.startsWith('zh-cn-')
      || tag === 'zh-hans' || tag.startsWith('zh-hans-')
      || tag === 'cmn' || tag.startsWith('cmn-');
  }
  if (locale === 'ja') return tag === 'ja' || tag.startsWith('ja-');
  return tag === 'en' || tag.startsWith('en-');
}

/**
 * Tiers an audition tap will try, in the order the code tries them.
 *
 * gTTS first (fast when it answers, and it is the only non-synth voice on
 * iOS), Edge second (upside only), device voice last (the tier that survives
 * a Referer-blocked Google and a 403'd Edge).
 */
export function auditionRoute(input: AuditionInput): AuditionRoute {
  const hops: AuditionEngine[] = [];
  if (input.gtts) hops.push('gtts');
  if (input.edge) hops.push('edge');
  if (input.synth) hops.push('synth');
  const terminal: AuditionEngine | 'none' = hops.length ? hops[hops.length - 1]! : 'none';
  const voices = input.voices ?? [];
  const hasLocaleVoice = voices.some((v) => matchesLocale(v.lang, input.locale));
  const reason = terminal === 'none'
    ? `no playable engine for ${input.locale}`
    : `${hops.join('>')} · ${input.locale} ${hasLocaleVoice ? 'device voice installed' : 'no matching device voice listed'}`;
  return { hops, terminal, playable: terminal !== 'none', reason };
}

/** Convenience: is any tier left for this locale? */
export function auditionPlayable(input: AuditionInput): boolean {
  return auditionRoute(input).playable;
}
