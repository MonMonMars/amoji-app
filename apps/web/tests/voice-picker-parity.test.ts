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

  it('neither surface invents a male/female split the audio does not have', () => {
    expect(picker).not.toContain("const GENDERS");
    expect(picker).not.toContain('genderLabel');
    expect(row).not.toContain("(['female', 'male'] as const)");
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      for (const button of selectTtsButtons(locale)) {
        expect('gender' in button).toBe(false);
      }
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
    expect(picker).toContain('`#${button.n} ${t(lang, button.labelKey)}`');
    expect(row).toContain('`#${button.n} ${t(lang, button.labelKey)}`');
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

  it('both explain a single-voice language and highlight the active voice', () => {
    expect(picker).toContain('isSingleVoiceLocale');
    expect(row).toContain('isSingleVoiceLocale');
    expect(picker).toContain("t(lang, 'voiceOnlyOneAvailable')");
    expect(row).toContain("t(lang, 'voiceOnlyOneAvailable')");
    expect(picker).toContain('activeVoiceChoice(locale)');
    expect(row).toContain('activeVoiceChoice(lang)');
    expect(isSingleVoiceLocale('ja')).toBe(true);
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
});
