import { describe, expect, it } from 'vitest';
import { t } from '../lib/prefs';

describe('soft-land status lines are localized', () => {
  const keys = ['softLandSelect', 'softLandStory', 'softLandChat'] as const;
  const langs = ['en', 'yue', 'zh', 'ja'] as const;

  it('every shipped language resolves a non-empty line', () => {
    for (const key of keys) {
      for (const lang of langs) {
        expect(t(lang, key).length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the exact English copy the pages used to hardcode', () => {
    expect(t('en', 'softLandSelect')).toBe('Taking you to character select...');
    expect(t('en', 'softLandStory')).toBe('Opening story select...');
    expect(t('en', 'softLandChat')).toBe('Taking you to chat...');
  });

  it('actually differs from English in the CJK languages', () => {
    for (const key of keys) {
      const en = t('en', key);
      for (const lang of ['yue', 'zh', 'ja'] as const) {
        expect(t(lang, key)).not.toBe(en);
      }
    }
  });
});
