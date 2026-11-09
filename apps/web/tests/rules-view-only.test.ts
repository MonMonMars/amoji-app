import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { LANGS, t } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('rules view-only (title bottom link)', () => {
  const quick = read('components/QuickSetup.tsx');
  const splash = read('app/page.tsx');
  const rules = read('app/rules/page.tsx');
  const setup = read('app/setup/page.tsx');

  it('title bottom link opens /rules, not first-run /setup consent', () => {
    expect(splash).toContain('data-testid="splash-setup-link"');
    expect(splash).toContain('href="/rules"');
    expect(splash).not.toMatch(/splash-setup-link[\s\S]{0,120}href="\/setup"/);
    // First-run boot still goes to consent /setup.
    expect(splash).toContain("router.replace('/setup')");
    expect(splash).toContain("router.push('/setup')");
  });

  it('/rules mounts QuickSetup in viewOnly mode with BACK', () => {
    expect(rules).toContain('viewOnly');
    expect(rules).toContain("backTestId=\"rules-back\"");
    expect(rules).toContain('QuickSetup');
  });

  it('/setup?view=1 also enables view-only (no Agree re-run)', () => {
    expect(setup).toContain("params.get('view') === '1'");
    expect(setup).toContain('viewOnly={viewOnly}');
  });

  it('view-only hides Agree/START and never routes to /gate/audio', () => {
    expect(quick).toContain('viewOnly');
    expect(quick).toContain("data-testid={viewOnly ? 'rules-view' : 'entry-gate'}");
    expect(quick).toContain('{!viewOnly && (');
    expect(quick).toContain('data-testid="setup-start"');
    // Consent path still soft-gates audio; view-only early-returns before that.
    expect(quick).toContain('if (viewOnly || busy || !prefsReady || !readToEnd) return;');
    expect(quick).toContain('/gate/audio?next=');
    expect(quick).toContain("showConsentDisclaimer={!viewOnly}");
    expect(quick).toContain("viewOnly ? 'rulesViewTitle' : 'setupOneTitle'");
  });

  it('view-only always exposes a BACK control', () => {
    expect(quick).toContain('const showBackBtn = showBack || viewOnly');
    expect(quick).toContain('navigateNavBack');
    expect(quick).toContain('data-testid={backTestId}');
  });

  it('LegalGate and nav-return allow /rules without stacking Accept', () => {
    expect(read('components/LegalGate.tsx')).toContain("'/rules'");
    expect(read('lib/nav-return.ts')).toContain("'/rules'");
  });

  it('rules strings exist in every shipped language', () => {
    for (const { id } of LANGS) {
      expect(t(id, 'rulesViewTitle')).toBeTruthy();
      expect(t(id, 'splashOpenSetup')).toBeTruthy();
      expect(t(id, 'splashOpenSetup')).not.toMatch(/start|開始|开始|はじめる/i);
    }
  });

  it('Settings owns mic unlock — rules view does not re-run audio gate', () => {
    const settings = read('components/SettingsSheet.tsx');
    expect(settings).toContain('requestMic');
    expect(settings).toContain('data-testid="settings-mic-allow"');
    expect(settings).toContain('gateMicAllow');
    expect(rules).not.toContain('PreChatAudioGate');
    expect(rules).not.toContain('/gate/audio');
    expect(quick).not.toContain('requestMic');
  });
});
