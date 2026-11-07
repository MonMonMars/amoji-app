import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet Close localized a11y', () => {
  it('names Close in yue/zh/ja/en without touching prefs', () => {
    expect(src).toContain("aria-label={lang === 'yue' ? '關閉' : lang === 'zh' ? '关闭' : lang === 'ja' ? '閉じる' : 'Close'}");
    expect(src).not.toContain('aria-label="Close"');
    expect(src).toContain('ref={settingsCloseRef}');
  });

  it('keeps dialog labelled by settings title', () => {
    expect(src).toContain('aria-labelledby="amoji-settings-title"');
    expect(src).toContain("t(lang, 'settings')");
  });
});
