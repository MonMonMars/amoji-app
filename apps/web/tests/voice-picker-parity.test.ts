import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDGE_VOICE_BUTTONS } from '../lib/voice-catalog';

const here = path.dirname(fileURLToPath(import.meta.url));
const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');

// Settings VoicePicker must show the SAME full numbered Edge set as the select
// board's TtsVoiceRow: both genders per locale, `#n` labels, pin by the
// button's own gender. Source contracts only — no jsdom mount.
describe('Settings VoicePicker parity with select TtsVoiceRow', () => {
  it('lists both genders per locale instead of flooring to companionGender', () => {
    expect(picker).toContain("const GENDERS: readonly VoiceGender[] = ['female', 'male']");
    expect(picker).toContain('GENDERS.map((gender)');
    // The old floor: early return on opposite gender + single-gender loop.
    expect(picker).not.toContain('button.gender !== companionGender) return');
    expect(picker).not.toContain('([companionGender] as const)');
    // Companion gender still only decides the cast default, not the list.
    expect(picker).toContain('gender: companionGender');
  });

  it('renders every catalog button, in the same grouped order as TtsVoiceRow', () => {
    expect(picker).toContain("const LOCALES: VoiceLocale[] = ['yue', 'zh', 'ja', 'en']");
    expect(picker).toContain('EDGE_VOICE_BUTTONS.filter((b) => b.locale === locale)');
    expect(picker).toContain('rows.filter((b) => b.gender === gender)');
    // Female group heading renders before the male group heading.
    expect(picker).toContain('genderLabel(gender)');
    expect(picker).toContain("t(lang, gender === 'female' ? 'genderFemale' : 'genderMale')");
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      for (const gender of ['female', 'male'] as const) {
        expect(EDGE_VOICE_BUTTONS.some((b) => b.locale === locale && b.gender === gender)).toBe(true);
      }
    }
  });

  it('shows the numbered `#n` label like the select row', () => {
    expect(picker).toContain('`#${button.n} ${button.label}`');
    expect(picker).toContain('{numLabel}');
    expect(picker).toContain('aria-label={numLabel}');
    expect(row).toContain('`#${button.n} ${button.label}`');
  });

  it('pins with the button’s own gender, not the companion gender', () => {
    expect(picker).toContain('saveVoicePick(button.locale, button.gender, button.id)');
    expect(picker).not.toContain('saveVoicePick(button.locale, companionGender');
    expect(row).toContain('saveVoicePick(button.locale, button.gender, button.id)');
  });

  it('keeps exclusive single pin per locale and cast default highlight', () => {
    expect(picker).toContain("voicePickFor(locale, 'female')");
    expect(picker).toContain("voicePickFor(locale, 'male')");
    expect(picker).toContain('ignoreVoicePick: true');
    expect(picker).toContain('const activeId = pinnedId ?? castId');
    expect(picker).toContain('const selected = button.id === activeId');
    expect(picker).not.toContain('castMatch');
  });

  it('previews on tap and switches language on a locale mismatch', () => {
    expect(picker).toContain('previewEdgeVoice(button.locale, button.id)');
    expect(picker).toContain('if (button.locale !== lang) onLang(button.locale)');
    expect(picker).not.toContain('onMouseEnter');
  });

  it('exposes data attrs the tests can read', () => {
    expect(picker).toContain('data-voice-n={button.n}');
    expect(picker).toContain('data-voice-gender={button.gender}');
  });
});
