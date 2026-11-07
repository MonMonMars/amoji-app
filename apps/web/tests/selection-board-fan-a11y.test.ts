import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SelectionBoard.tsx'), 'utf8');

describe('SelectionBoard ArcFan ariaLabel localized a11y', () => {
  it('names character/scene/language fans from choose* i18n keys', () => {
    expect(src).toContain("ariaLabel={t(lang, 'chooseCharacter')}");
    expect(src).toContain("ariaLabel={t(lang, 'chooseBackground')}");
    expect(src).toContain("ariaLabel={t(lang, 'chooseLanguage')}");
    expect(src).not.toContain('ariaLabel="characters"');
    expect(src).not.toContain('ariaLabel="scenes"');
    expect(src).not.toContain('ariaLabel="languages"');
  });

  it('keeps visible choose* headings', () => {
    expect(src).toContain("t(lang, 'chooseCharacter')");
    expect(src).toContain("t(lang, 'chooseBackground')");
    expect(src).toContain("t(lang, 'chooseLanguage')");
  });
});
