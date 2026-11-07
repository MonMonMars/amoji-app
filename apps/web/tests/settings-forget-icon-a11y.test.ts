import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet memory forget icon a11y', () => {
  it('localizes per-item forget icon deletes via forgetOneConfirm', () => {
    const matches = src.match(/aria-label=\{t\(lang, 'forgetOneConfirm'\)\}/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
    expect(src).not.toContain('aria-label="forget"');
    expect(src).not.toContain('aria-label="forget diary line"');
    expect(src).not.toContain('aria-label="forget date"');
    expect(src).not.toContain('aria-label="forget promise"');
  });

  it('keeps forget-all on forgetBtn', () => {
    expect(src).toContain("aria-label={t(lang, 'forgetBtn')}");
    expect(src).toContain("onClick={forgetAll}");
  });
});
