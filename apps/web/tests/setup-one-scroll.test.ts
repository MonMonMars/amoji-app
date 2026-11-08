import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS, t } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('setup one — full scroll disclosure', () => {
  const shared = read('components/setup-one-shared.tsx');
  const quick = read('components/QuickSetup.tsx');

  it('QuickSetup delegates scroll content to SetupOneScrollBody', () => {
    expect(quick).toContain('SetupOneScrollBody');
    expect(quick).not.toContain('SetupLegalLinks');
    expect(quick).toContain('data-testid="setup-one-scroll"');
    expect(quick).toContain('data-testid="setup-one-scroll-end"');
    expect(quick).toContain('useScrollReachedEnd');
    expect(quick).toContain('data-testid="setup-start"');
  });

  it('scroll body inlines age, audio, mic, safety, and full legal docs', () => {
    expect(shared).toContain('SetupOneScrollBody');
    expect(shared).toContain('privacyDoc');
    expect(shared).toContain('termsDoc');
    expect(shared).toContain("t(lang, 'gate18Title')");
    expect(shared).toContain("t(lang, 'gateAudioTitle')");
    expect(shared).toContain("t(lang, 'gateMicTitle')");
    expect(shared).toContain("t(lang, 'safetyLead')");
    expect(shared).toContain("t(lang, 'safetyHelplinesTitle')");
    expect(shared).toContain('CRISIS_HELPLINES');
    expect(shared).toContain("t(lang, 'aiNotice')");
    expect(shared).not.toContain('SetupLegalLinks');
  });

  it('new setup strings exist in every shipped language', () => {
    for (const { id } of LANGS) {
      expect(t(id, 'setupDisclosureAiTitle')).toBeTruthy();
    }
  });
});
