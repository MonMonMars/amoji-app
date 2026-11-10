import { describe, expect, it } from 'vitest';
import { LANGS, STRINGS, type Lang } from '../lib/prefs';

describe('yourNamePlaceholder i18n', () => {
  it('ships a distinct example name per language', () => {
    const values = LANGS.map(({ id }) => STRINGS.yourNamePlaceholder[id as Lang]);
    expect(new Set(values).size).toBe(LANGS.length);
    expect(STRINGS.yourNamePlaceholder.en).toBe('Simon');
    expect(STRINGS.yourNamePlaceholder.yue).toBe('嘉欣');
    expect(STRINGS.yourNamePlaceholder.zh).toBe('小明');
    expect(STRINGS.yourNamePlaceholder.ja).toBe('太郎');
  });
});
