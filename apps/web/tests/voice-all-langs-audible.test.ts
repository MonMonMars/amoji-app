/**
 * "Lots of voice buttons, but only Cantonese works."
 *
 * Two separate defects produced that report, and this file pins both:
 *
 *  1. ENGINE — the picker/audition path only ever tried gTTS and Edge, then
 *     stopped. Measured 2026-11-23 in a browser (not Node):
 *     `translate.google.com/translate_tts` answers 200 audio/mpeg with no
 *     Referer and 404 text/html with the page as Referer, identically for
 *     `tl=yue`, `zh-CN`, `zh-HK`, `ja` and `en-US`. Every browser media load
 *     carries a Referer, so the gTTS hop rejects with MediaError 4 on every
 *     language there, and Edge read-aloud still 403s. speechSynthesis is then
 *     the only tier left — and the audition code refused it ("skip synth
 *     robot"). Result: every button in the row is mute, and the only sound the
 *     owner heard was the Cantonese gate/chat line, whose chain does include
 *     synth.
 *
 *  2. SPEAKER — `pickVoice()` fell back to the WHOLE installed voice list when
 *     the device had no voice for the language (`byLang.length ? byLang :
 *     cached`). A Hong Kong device with zh-HK but no zh-CN/ja pack therefore
 *     spoke Mandarin/Japanese text with a Cantonese or English voice: "some
 *     other language happens to be at another speaker".
 *
 * Guards here:
 *  - `auditionRoute()` must resolve to a playable hop for yue/zh/ja/en under
 *    both real-world capability sets (browser with gTTS blocked, and Safari
 *    with gTTS alive but the OS silent switch muting synth).
 *  - `synthVoicePool()` must never hand a language a foreign voice.
 *  - The greeting/preview source must keep the terminal synth hop wired, so a
 *    future narrowing cannot silently return the row to mute.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditionRoute, auditionPlayable } from '../lib/voice-audition';
import { synthVoicePool } from '../lib/voice-catalog';
import { selectTtsButtons } from '../lib/tts-button-registry';
import { engineIsOffered } from '../lib/voice-capability';
import { ttsAppPicksForLocale, TTS_APP_PICK_COUNTS } from '../lib/tts-app-picks';

const LOCALES = ['yue', 'zh', 'ja', 'en'] as const;
const here = __dirname;

const voice = readFileSync(join(here, '../lib/voice.ts'), 'utf8');
const catalogue = readFileSync(join(here, '../components/TtsAppPicksPanel.tsx'), 'utf8');

function fnBody(name: string, nextName: string): string {
  const start = voice.indexOf(`export function ${name}`);
  const end = voice.indexOf(nextName, start);
  return voice.slice(start, end === -1 ? undefined : end);
}

const greet = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
const preview = fnBody('previewVoiceChoice', 'export function previewOsVoice');

/** What a desktop / Android browser really offers (see file header). */
const BROWSER_CAPS = { gtts: false, edge: false, synth: true } as const;
/** iPhone with the hardware silent switch on: synth is inaudible, gTTS is not. */
const IPHONE_MUTED_CAPS = { gtts: true, edge: false, synth: false } as const;

describe('every picker button resolves to a playable engine', () => {
  it('all four locales still speak when Google 404s and Edge 403s (browser)', () => {
    for (const locale of LOCALES) {
      const route = auditionRoute({ locale, ...BROWSER_CAPS });
      expect(route.playable, locale).toBe(true);
      expect(route.terminal, locale).toBe('synth');
      expect(route.hops, locale).toEqual(['synth']);
    }
  });

  it('all four locales still speak on a silent-switch iPhone (gTTS only)', () => {
    for (const locale of LOCALES) {
      const route = auditionRoute({ locale, ...IPHONE_MUTED_CAPS });
      expect(route.playable, locale).toBe(true);
      expect(route.terminal, locale).toBe('gtts');
    }
  });

  it('reports none only when every tier is dead, so the UI can stay honest', () => {
    for (const locale of LOCALES) {
      const route = auditionRoute({ locale, gtts: false, edge: false, synth: false });
      expect(route.playable, locale).toBe(false);
      expect(route.terminal, locale).toBe('none');
      expect(route.reason, locale).toContain('no playable engine');
      expect(auditionPlayable({ locale, gtts: false, edge: false, synth: false })).toBe(false);
    }
  });

  it('tries gTTS before Edge before the device voice', () => {
    const route = auditionRoute({ locale: 'zh', gtts: true, edge: true, synth: true });
    expect(route.hops).toEqual(['gtts', 'edge', 'synth']);
    expect(route.terminal).toBe('synth');
  });

  it('names whether the device lists a voice for the locale, per language', () => {
    // The owner's Hong Kong device: zh-HK only.
    const voices = [{ lang: 'zh-HK' }, { lang: 'en-US' }];
    expect(auditionRoute({ locale: 'yue', ...BROWSER_CAPS, voices }).reason).toContain('device voice installed');
    expect(auditionRoute({ locale: 'en', ...BROWSER_CAPS, voices }).reason).toContain('device voice installed');
    expect(auditionRoute({ locale: 'zh', ...BROWSER_CAPS, voices }).reason).toContain('no matching device voice listed');
    expect(auditionRoute({ locale: 'ja', ...BROWSER_CAPS, voices }).reason).toContain('no matching device voice listed');
    // No voice listed does not make the button unplayable: the utterance keeps
    // `lang` set and the platform picks (Android/Safari populate late).
    expect(auditionRoute({ locale: 'ja', ...BROWSER_CAPS, voices }).playable).toBe(true);
  });

  it('every rendered voice button is gated on an engine the audit offers', () => {
    for (const locale of LOCALES) {
      const buttons = selectTtsButtons(locale);
      expect(buttons.length, locale).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.engine, `${locale} ${button.id}`).toBe('gtts');
        expect(engineIsOffered(button.engine), button.id).toBe(true);
        expect(button.tl.length, button.id).toBeGreaterThan(0);
      }
    }
  });
});

describe('a language never borrows another language voice', () => {
  const hkDevice = [
    { lang: 'zh-HK', name: 'Sin-ji' },
    { lang: 'zh-HK', name: 'Danny' },
    { lang: 'en-US', name: 'Zira' },
  ];

  it('keeps Cantonese on zh-HK', () => {
    expect(synthVoicePool(hkDevice, 'yue').map((v) => v.name)).toEqual(['Sin-ji', 'Danny']);
  });

  it('returns empty (not the English voice) when Mandarin is not installed', () => {
    expect(synthVoicePool(hkDevice, 'zh')).toEqual([]);
  });

  it('returns empty (not the Cantonese voice) when Japanese is not installed', () => {
    expect(synthVoicePool(hkDevice, 'ja')).toEqual([]);
  });

  it('keeps English on English', () => {
    expect(synthVoicePool(hkDevice, 'en').map((v) => v.name)).toEqual(['Zira']);
  });

  it('pickVoice uses the same-language pool, never the whole list', () => {
    expect(voice).toContain('synthVoicePool(cached, lang)');
    expect(voice).not.toMatch(/byLang\.length \? byLang : cached/);
  });
});

describe('the audition path keeps the terminal device-voice hop', () => {
  it('playVoiceGreeting reaches synthSpeak only from the fallbacks', () => {
    expect(greet).toContain('const auditionSynth');
    expect(greet).toContain('auditionRoute({');
    expect(greet).toContain('synthSpeak(');
    expect(greet).toMatch(/const auditionSynth = \(tag: string\): void => \{[\s\S]*?if \(stale\(\) \|\| spokenBy\) return;/);
    // The primary gTTS start must not reach synth in the same turn.
    expect(greet).not.toMatch(/const runSynthAudition = \(tag: string\) => \{[\s\S]{0,80}?synthSpeak\(/);
    // Deep/mid/bright must still differ on the device voice.
    expect(greet).toMatch(/synthSpeak\([\s\S]*?greetEdgeProsody\.rate \* 0\.9/);
  });

  it('previewVoiceChoice mirrors the same chain', () => {
    expect(preview).toContain('const auditionSynth');
    expect(preview).toContain('auditionRoute({');
    expect(preview).toContain('synthSpeak(');
    expect(preview).toMatch(/const auditionSynth = \(tag: string\): void => \{[\s\S]*?if \(stale\(\) \|\| spokenBy\) return;/);
    expect(preview).toMatch(/synthSpeak\([\s\S]*?previewEdgeProsody\.rate \* 0\.9/);
  });

  it('does not pay the 3.5s Edge socket timeout when its breaker is open', () => {
    expect(greet).toMatch(/if \(edgeEndpointsDead\(\)\) \{ auditionSynth\(/);
    expect(preview).toMatch(/if \(edgeEndpointsDead\(\)\) \{ auditionSynth\(/);
  });

  it('the catalogue shows a preview only for bundled Edge rows, labelled', () => {
    expect(catalogue).toContain("row.kind === 'edge' &&");
    expect(catalogue).toContain("ttsAppPickShortName");
    for (const locale of LOCALES) {
      const rows = ttsAppPicksForLocale(locale);
      expect(rows.length, locale).toBe(TTS_APP_PICK_COUNTS[locale].total);
      for (const row of rows) {
        // A link-only model has no engine behind it: no audio affordance.
        if (row.kind === 'link') expect(row.edgeVoiceId, row.id).toBeUndefined();
        if (row.kind === 'edge') expect(row.edgeVoiceId, row.id).toBeTruthy();
      }
    }
  });
});
