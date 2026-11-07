import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash Continue to login localized a11y', () => {
  it('localizes continue control in yue/zh/ja/en', () => {
    expect(src).toContain("import { loadPrefs } from '../lib/prefs'");
    expect(src).toContain('const lang = loadPrefs().lang');
    expect(src).toContain("lang === 'yue' ? '繼續登入'");
    expect(src).toContain("lang === 'zh' ? '继续登录'");
    expect(src).toContain("lang === 'ja' ? 'ログインへ進む'");
    expect(src).toContain('aria-label={continueLogin}');
    expect(src).not.toContain('aria-label="Continue to login"');
  });
});
