import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('legal pages + LegalGate link a11y', () => {
  it('LegalGate privacy/terms links expose title aria-labels (not path-only names)', () => {
    const gate = read('components/LegalGate.tsx');
    // Titles come from the localized legal-copy table, so the link's accessible
    // name is the document's own title in every language.
    expect(gate).toContain('aria-label={privacy.title}');
    expect(gate).toContain('aria-label={terms.title}');
    expect(gate).toContain('href="/privacy"');
    expect(gate).toContain('href="/terms"');
  });

  it('privacy + terms pages name the main and Back control', () => {
    const privacy = read('app/privacy/page.tsx');
    const terms = read('app/terms/page.tsx');
    expect(privacy).toContain('id="amoji-privacy-title"');
    expect(privacy).toContain('aria-labelledby="amoji-privacy-title"');
    expect(privacy).toContain('aria-label={backHome}');
    expect(privacy).toContain("const backHome = lang === 'yue' ? '返回主頁'");
    expect(privacy).toContain("{t(lang, 'back')}");
    expect(terms).toContain('id="amoji-terms-title"');
    expect(terms).toContain('aria-labelledby="amoji-terms-title"');
    expect(terms).toContain('aria-label={backHome}');
    expect(terms).toContain("const backHome = lang === 'yue' ? '返回主頁'");
    expect(terms).toContain("{t(lang, 'back')}");
  });
});
