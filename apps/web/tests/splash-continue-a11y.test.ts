import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash Start localized a11y', () => {
  it('uses the prefs Start label in every language', () => {
    expect(src).toContain("import { t, usePrefs } from '../lib/prefs'");
    expect(src).toContain("t(lang, 'splashStart')");
    expect(src).toContain('aria-label={startLabel}');
    expect(src).not.toContain('aria-label="Continue to login"');
    expect(src).not.toContain("lang === 'yue' ? '繼續登入'");
  });
});
