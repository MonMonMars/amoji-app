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

  it('mic optional section is copy-only — no composer or typing field', () => {
    expect(shared).toContain('data-testid="setup-mic-section"');
    const micStart = shared.indexOf('data-testid="setup-mic-section"');
    const micEnd = shared.indexOf('setup-safety-heading', micStart);
    const micBlock = shared.slice(micStart, micEnd === -1 ? undefined : micEnd);
    expect(micBlock).toContain("t(lang, 'gateMicTitle')");
    expect(micBlock).toContain("t(lang, 'gateMicBody')");
    expect(micBlock).not.toMatch(/<textarea\b|<input\b/);
    // Rules scroll is disclosure only — do not dump unsupported as a fake field.
    expect(micBlock).not.toContain("t(lang, 'gateMicUnsupported')");
  });

  it('new setup strings exist in every shipped language', () => {
    for (const { id } of LANGS) {
      expect(t(id, 'setupDisclosureAiTitle')).toBeTruthy();
    }
  });
});
