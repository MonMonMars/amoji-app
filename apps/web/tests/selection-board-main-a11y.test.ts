import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SelectionBoard.tsx'), 'utf8');

describe('SelectionBoard main landmark a11y', () => {
  it('labels main via stable sr-only title', () => {
    expect(src).toContain('aria-labelledby="amoji-selection-title"');
    expect(src).toContain('id="amoji-selection-title"');
    expect(src).toContain('className="sr-only"');
    expect(src).toContain("mode === 'start' ? t(lang, 'selectTitle') : t(lang, 'changeCta')");
  });

  it('keeps busy state and START/Change CTA label', () => {
    expect(src).toContain('aria-busy={!prefsReady}');
    expect(src).toContain("aria-label={mode === 'start' ? t(lang, 'confirmCta') : t(lang, 'changeCta')}");
  });
});
