import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/sfx-gallery/page.tsx'), 'utf8');

describe('sfx-gallery Back/Open chat localized a11y', () => {
  it('localizes Back to select + Open chat in yue/zh/ja/en', () => {
    expect(src).toContain("import { loadPrefs } from '../../lib/prefs'");
    expect(src).toContain('const lang = loadPrefs().lang');
    expect(src).toContain("lang === 'yue' ? '返回選擇'");
    expect(src).toContain("lang === 'yue' ? '打開傾偈'");
    expect(src).toContain('aria-label={backSelect}');
    expect(src).toContain('aria-label={openChat}');
    expect(src).not.toContain('aria-label="Back to select"');
    expect(src).not.toContain('aria-label="Open chat"');
  });
});
