import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const sheet = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet Change / Save·Test / gender a11y', () => {
  it('labels Change-character card with changeCta', () => {
    expect(sheet).toContain("onClick={() => { onClose(); router.push('/change'); }}");
    expect(sheet).toContain("aria-label={t(lang, 'changeCta')}");
  });

  it('exposes gender chips as pressed toggles', () => {
    expect(sheet).toContain('aria-pressed={gender === g}');
    expect(sheet).toContain("onClick={() => setGenderPick(g)}");
    expect(sheet).toContain("t(lang, g === 'male' ? 'genderMale' : g === 'female' ? 'genderFemale' : 'genderSecret')");
  });

  it('labels Save / Clear / Test voice actions (stable when glyph collapses)', () => {
    expect(sheet).toContain("aria-label={t(lang, 'ttsProxySave')}");
    expect(sheet).toContain("aria-label={t(lang, 'ttsProxyClear')}");
    expect(sheet).toContain("aria-label={t(lang, 'testVoiceBtn')}");
    expect(sheet).toContain('onClick={runOpenAiTest}');
    expect(sheet).toContain('onClick={runProxyTest}');
    expect(sheet).toContain('onClick={runVoiceTest}');
  });
});
