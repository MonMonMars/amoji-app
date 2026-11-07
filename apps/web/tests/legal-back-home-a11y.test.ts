import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('privacy/terms Back to home localized a11y', () => {
  it('localizes Back aria-label in yue/zh/ja/en on both pages', () => {
    for (const rel of ['app/privacy/page.tsx', 'app/terms/page.tsx'] as const) {
      const src = read(rel);
      expect(src).toContain("const lang = loadPrefs().lang");
      expect(src).toContain("const backHome = lang === 'yue' ? '返回主頁' : lang === 'zh' ? '返回首页' : lang === 'ja' ? 'ホームに戻る' : 'Back to home'");
      expect(src).toContain('aria-label={backHome}');
      expect(src).toContain("{t(lang, 'back')}");
      expect(src).not.toContain('aria-label="Back to home"');
    }
  });
});
