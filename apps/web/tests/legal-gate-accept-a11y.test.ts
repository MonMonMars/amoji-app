import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const gate = readFileSync(join(__dirname, '../components/LegalGate.tsx'), 'utf8');

describe('LegalGate Accept aria-label', () => {
  it('names the Accept control (privacy/terms links already labeled)', () => {
    expect(gate).toContain('data-testid="legal-accept"');
    expect(gate).toContain('aria-label={COPY.accept[lang]}');
    expect(gate).toContain('{COPY.accept[lang]}');
  });

  // The document titles moved into one localized table (lib/legal-copy.ts) so
  // the gate card and the full pages cannot disagree. The links still need a
  // real name, not a bare "/privacy".
  it('gives privacy/terms links the localized document titles', () => {
    expect(gate).toContain('aria-label={privacy.title}');
    expect(gate).toContain('aria-label={terms.title}');
    expect(gate).toContain('const privacy = privacySummary(lang)');
    expect(gate).toContain('const terms = termsSummary(lang)');
  });
});
