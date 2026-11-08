import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('legal pages + LegalGate link a11y', () => {
  it('LegalGate privacy/terms links expose title aria-labels and point at /setup anchors', () => {
    const gate = read('components/LegalGate.tsx');
    expect(gate).toContain('aria-label={privacy.title}');
    expect(gate).toContain('aria-label={terms.title}');
    expect(gate).toContain('href="/setup#setup-privacy-heading"');
    expect(gate).toContain('href="/setup#setup-terms-heading"');
  });

  it('legacy privacy/terms/safety URLs render the unified QuickSetup scroll', () => {
    const privacy = read('app/privacy/page.tsx');
    const terms = read('app/terms/page.tsx');
    const safety = read('app/safety/page.tsx');
    expect(privacy).toContain('QuickSetup');
    expect(terms).toContain('QuickSetup');
    expect(safety).toContain('QuickSetup');
    expect(privacy).toContain('setup-privacy-heading');
    expect(terms).toContain('setup-terms-heading');
    expect(safety).toContain('setup-safety-heading');
  });
});
