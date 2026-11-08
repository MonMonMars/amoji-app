import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('unified setup back control a11y', () => {
  it('QuickSetup exposes a localized back button on routed legal URLs', () => {
    const quick = read('components/QuickSetup.tsx');
    expect(quick).toContain("backTestId = 'setup-back'");
    expect(quick).toContain('navigateNavBack(router)');
    expect(quick).toContain("aria-label={t(lang, 'back')}");
    for (const rel of ['app/privacy/page.tsx', 'app/terms/page.tsx', 'app/safety/page.tsx'] as const) {
      expect(read(rel)).toContain('QuickSetup');
    }
    expect(read('app/terms/page.tsx')).toContain('terms-back');
  });
});
