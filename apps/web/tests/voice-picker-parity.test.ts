/**
 * Settings → Voice must show the SAME real voices as the select board's row.
 *
 * Both used to render the full 58-name Edge grid. Every one of those names
 * played the same audio (Edge refuses this app), so "parity" then meant two
 * surfaces agreeing on a list of buttons that could not change the sound. The
 * parity that matters now is: same registry, same one-per-distinct-speaker
 * collapse, same single-voice explanation.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectTtsButtons, isSingleVoiceLocale } from '../lib/tts-button-registry';
import {
  ALL_LOCALES,
  engineIsOffered,
  localeHasPlayableBothGenders,
  localePlayableGenderCounts,
} from '../lib/voice-capability';

const here = path.dirname(fileURLToPath(import.meta.url));
const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');

describe('Settings VoicePicker parity with select TtsVoiceRow', () => {
  it('both read the same gated registry', () => {
    expect(picker).toContain('selectTtsButtons');
    expect(row).toContain('selectTtsButtons');
    expect(picker).not.toContain('EDGE_VOICE_BUTTONS');
    expect(row).not.toContain('EDGE_VOICE_BUTTONS');
  });

  it('both label each button with its actual source gender and natural tier', () => {
    expect(picker).toContain('voiceFreeFemale');
    expect(picker).toContain('voiceFreeMale');
    expect(picker).toContain('pitchTierLabelKey');
    expect(row).toContain('pitchTierLabelKey');
    expect(row).toContain('deliveryGender');
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const buttons = selectTtsButtons(locale);
      expect(buttons.length, locale).toBeGreaterThan(0);
      expect(buttons.every((b) => b.deliveryGender === 'female'), locale).toBe(true);
      expect(buttons.every((b) => b.pitchTier === 'mid'), locale).toBe(true);
    }
  });

  it('both list every locale, using a per-language heading', () => {
    expect(picker).toContain("const LOCALES: VoiceLocale[] = ['yue', 'zh', 'ja', 'en']");
    expect(picker).toContain('selectTtsButtons(locale)');
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      expect(selectTtsButtons(locale).length).toBeGreaterThan(0);
    }
  });

  it('both number their buttons `#n` and label them from the string table', () => {
    expect(picker).toContain('voiceFreeFemale');
    expect(row).toContain('voiceFreeFemale');
    expect(picker).toContain('button.labelKey');
    expect(row).toContain('button.labelKey');
    expect(picker).toContain('aria-label={numLabel}');
    expect(row).toContain('aria-label={numLabel}');
    expect(picker).toContain('aria-pressed={selected}');
    expect(row).toContain('aria-pressed={selected}');
  });

  it('both pin by language only, with no gender slot left over', () => {
    expect(picker).toContain('saveVoicePick(button.locale, button.id)');
    expect(row).toContain('saveVoicePick(button.locale, button.id)');
    expect(picker).not.toContain('button.gender');
    expect(row).not.toContain('button.gender');
  });

  it('both keep the single-voice note hook and highlight the active voice', () => {
    expect(picker).toContain('isSingleVoiceLocale');
    expect(row).toContain('isSingleVoiceLocale');
    expect(picker).toContain("t(lang, 'voiceOnlyOneAvailable')");
    expect(row).toContain("t(lang, 'voiceOnlyOneAvailable')");
    expect(picker).toContain('activeVoiceChoice(locale, companionGender)');
    expect(row).toContain('activeVoiceChoice(locale, companionGender)');
    expect(row).toContain('activeIdFor(button.locale)');
    // Note explains one Google speaker (yue/ja); pitch × gender still multiplies buttons.
    expect(isSingleVoiceLocale('ja')).toBe(true);
    expect(isSingleVoiceLocale('yue')).toBe(true);
    expect(isSingleVoiceLocale('zh')).toBe(false);
    expect(isSingleVoiceLocale('en')).toBe(false);
  });

  it('both preview the exact voice a tap will keep', () => {
    expect(picker).toContain('previewVoiceChoice(button.locale, button.id)');
    expect(row).toContain('playVoiceGreeting(characterId, button.locale, button.id)');
    expect(picker).not.toContain('previewEdgeVoice');
    expect(row).not.toContain('previewEdgeVoice');
  });

  it('exposes data attrs the tests can read', () => {
    expect(picker).toContain('data-voice-n={button.n}');
    expect(picker).toContain('data-voice-id={button.id}');
    expect(row).toContain('data-voice-n={button.n}');
    expect(row).toContain('data-voice-id={button.id}');
  });

  it('every locale has ≥1 playable female gTTS button and no male gTTS label', () => {
    expect(ALL_LOCALES).toEqual(['yue', 'zh', 'ja', 'en']);
    for (const locale of ALL_LOCALES) {
      // There is no male speaker behind any shipped `tl`, so the picker must
      // not claim both genders (that claim was the reported bug).
      expect(localeHasPlayableBothGenders(locale), locale).toBe(false);
      const counts = localePlayableGenderCounts(locale);
      expect(counts.female, `${locale} female playable`).toBeGreaterThanOrEqual(1);
      expect(counts.male, `${locale} male playable`).toBe(0);
      const buttons = selectTtsButtons(locale);
      expect(buttons.every((b) => b.deliveryGender === 'female'), locale).toBe(true);
      expect(buttons.every((b) => engineIsOffered(b.engine))).toBe(true);
      expect(buttons.every((b) => b.id.startsWith('gtts:'))).toBe(true);
    }
  });
});
