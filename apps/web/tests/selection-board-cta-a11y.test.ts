import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SelectionBoard.tsx'), 'utf8');

describe('SelectionBoard START/Change a11y', () => {
  it('labels confirm CTA for start and change modes', () => {
    expect(src).toContain('data-dev="T1"');
    expect(src).toContain("aria-label={mode === 'start' ? t(lang, 'confirmCta') : t(lang, 'changeCta')}");
    expect(src).toContain('type="button"');
    expect(src).toContain('onClick={confirm}');
  });

  it('still renders localized CTA text', () => {
    expect(src).toContain("mode === 'start' ? t(lang, 'confirmCta') : t(lang, 'changeCta')");
  });
});
