import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('scroll chevron localized a11y', () => {
  it('HScrollRow + ArcFan use scrollLeft/scrollRight i18n', () => {
    for (const rel of ['components/HScrollRow.tsx', 'components/ArcFan.tsx'] as const) {
      const src = read(rel);
      expect(src).toContain("aria-label={t(lang, 'scrollLeft')}");
      expect(src).toContain("aria-label={t(lang, 'scrollRight')}");
      expect(src).toContain('const lang = loadPrefs().lang');
      expect(src).not.toContain('aria-label="scroll left"');
      expect(src).not.toContain('aria-label="scroll right"');
    }
  });

  it('ships scrollLeft/scrollRight copy for en/yue/zh/ja', () => {
    const prefs = read('lib/prefs.ts');
    expect(prefs).toContain("| 'scrollLeft' | 'scrollRight'");
    expect(prefs).toContain("scrollLeft: { en: 'Scroll left', yue: '向左滑', zh: '向左滚动', ja: '左にスクロール' }");
    expect(prefs).toContain("scrollRight: { en: 'Scroll right', yue: '向右滑', zh: '向右滚动', ja: '右にスクロール' }");
  });
});
