import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const sheet = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet VolumeSteps step aria-labels', () => {
  it('each volume step button names the control + percent (not digit-only)', () => {
    expect(sheet).toContain('function VolumeSteps');
    expect(sheet).toContain('aria-label={`${label} ${step}%`}');
    expect(sheet).toContain('aria-pressed={value === step}');
    expect(sheet).toContain('VOLUME_STEPS.map');
  });

  it('keeps the three volume rows (voice / bgm / sfx)', () => {
    expect(sheet).toContain("t(lang, 'voiceVolume')");
    expect(sheet).toContain("t(lang, 'bgmVolume')");
    expect(sheet).toContain("t(lang, 'sfxVolume')");
    const calls = sheet.match(/<VolumeSteps\b/g) || [];
    expect(calls.length).toBe(3);
  });
});
