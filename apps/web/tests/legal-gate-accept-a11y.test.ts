import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const gate = readFileSync(join(__dirname, '../components/LegalGate.tsx'), 'utf8');

describe('LegalGate Accept aria-label', () => {
  it('names the Accept control (privacy/terms links already labeled)', () => {
    expect(gate).toContain('data-testid="legal-accept"');
    expect(gate).toContain('aria-label={c.accept[lang]}');
    expect(gate).toContain('{c.accept[lang]}');
  });

  it('does not disturb privacy/terms title labels', () => {
    expect(gate).toContain('aria-label={c.privacyTitle[lang]}');
    expect(gate).toContain('aria-label={c.termsTitle[lang]}');
  });
});
