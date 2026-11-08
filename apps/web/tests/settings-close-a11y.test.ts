import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const src = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet Close localized a11y', () => {
  it('names Close via the string table in yue/zh/ja/en', () => {
    expect(src).toContain("aria-label={t(lang, 'close')}");
    expect(src).not.toContain('aria-label="Close"');
    expect(src).not.toContain("lang === 'yue' ? '關閉'");
    expect(src).toContain('ref={settingsCloseRef}');
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(t(lang, 'close').length).toBeGreaterThan(0);
    }
  });

  it('keeps dialog labelled by settings title', () => {
    expect(src).toContain('aria-labelledby="amoji-settings-title"');
    expect(src).toContain("t(lang, 'settings')");
  });
});
