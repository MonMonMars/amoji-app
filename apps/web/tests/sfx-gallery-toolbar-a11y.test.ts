import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/sfx-gallery/page.tsx'), 'utf8');

describe('sfx-gallery toolbar Copy/Clear/Reset localized a11y', () => {
  it('localizes Copy Want/Skip, Clear skipped, Reset all', () => {
    expect(src).toContain('const copyWantSkip =');
    expect(src).toContain('const clearSkipped =');
    expect(src).toContain('const resetAll =');
    expect(src).toContain("lang === 'yue' ? '複製 Want/Skip JSON'");
    expect(src).toContain("lang === 'yue' ? '清除已 Skip'");
    expect(src).toContain("lang === 'yue' ? '重設全部選擇'");
    expect(src).toContain('aria-label={copyWantSkip}');
    expect(src).toContain('aria-label={clearSkipped}');
    expect(src).toContain('aria-label={resetAll}');
    expect(src).not.toContain('aria-label="Copy Want/Skip JSON"');
    expect(src).not.toContain('aria-label="Clear skipped picks"');
    expect(src).not.toContain('aria-label="Reset all picks"');
  });

  it('keeps Back/Open chat localization from #217', () => {
    expect(src).toContain('aria-label={backSelect}');
    expect(src).toContain('aria-label={openChat}');
  });
});
