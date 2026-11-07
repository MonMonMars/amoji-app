import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const sheet = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet tutor / companion export a11y', () => {
  it('labels the tutor help row', () => {
    expect(sheet).toContain('onClick={tutor}');
    expect(sheet).toContain("aria-label={t(lang, 'tutorBtn')}");
  });

  it('labels companion export + import file control', () => {
    expect(sheet).toContain('downloadCompanionFile(APP_REVISION)');
    expect(sheet).toContain("aria-label={t(lang, 'exportCompanion')}");
    expect(sheet).toContain("aria-label={t(lang, 'importCompanion')}");
    expect(sheet).toContain('type="file"');
  });

  it('keeps stable memory export / forget labels', () => {
    expect(sheet).toContain("aria-label={t(lang, 'memoryExport')}");
    expect(sheet).toContain("aria-label={t(lang, 'forgetBtn')}");
    expect(sheet).toContain('onClick={() => void copyAll()}');
    expect(sheet).toContain('onClick={forgetAll}');
  });
});
