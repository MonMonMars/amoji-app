import { describe, expect, it } from 'vitest';
import { t } from '../lib/prefs';

describe('yourNamePlaceholder i18n', () => {
  it('resolves a non-empty example in every shipped language', () => {
    const langs = ['en', 'yue', 'zh', 'ja'] as const;
    const seen = new Set<string>();
    for (const lang of langs) {
      const s = t(lang, 'yourNamePlaceholder');
      expect(s.length).toBeGreaterThan(0);
      seen.add(s);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('keeps the previous English example', () => {
    expect(t('en', 'yourNamePlaceholder')).toBe('Simon');
  });
});
