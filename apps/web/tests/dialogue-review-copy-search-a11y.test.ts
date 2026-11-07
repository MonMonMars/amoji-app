import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/dialogue-review/page.tsx'), 'utf8');

describe('dialogue-review Copy/Search localized a11y', () => {
  it('localizes Copy result + Search lines in yue/zh/ja/en', () => {
    expect(src).toContain("import { loadPrefs } from '../../lib/prefs'");
    expect(src).toContain('const copyResultLabel =');
    expect(src).toContain('const searchLinesLabel =');
    expect(src).toContain("lang === 'yue' ? '複製結果'");
    expect(src).toContain("lang === 'yue' ? '搜尋對白'");
    expect(src).toContain('aria-label={copyResultLabel}');
    expect(src).toContain('aria-label={searchLinesLabel}');
    expect(src).not.toContain('aria-label="Copy result"');
    expect(src).not.toContain('aria-label="Search lines"');
    const tags = src.match(/<button type="button" className="drv-copy"[^>]*>/g) ?? [];
    expect(tags.length).toBe(2);
    for (const tag of tags) expect(tag).toContain('aria-label={copyResultLabel}');
  });
});
