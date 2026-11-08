import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RequireEntryGate from '../components/RequireEntryGate';
import { LANGS, t } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('entry gate — one-tap fallback screen (source)', () => {
  const quick = read('components/QuickSetup.tsx');
  const gate = read('components/EntryGate.tsx');

  it('EntryGate re-exports QuickSetup only', () => {
    expect(gate).toContain('QuickSetup');
    expect(gate).not.toContain('entry-gate-18-continue');
  });

  it('QuickSetup shows a single START, back, and disclaimer copy', () => {
    expect(quick).toContain('data-testid="entry-gate"');
    expect(quick).toContain('data-testid="setup-start"');
    expect(quick).toContain('data-testid="setup-back"');
    expect(quick).toContain("t(lang, 'splashStart')");
    expect(quick).toContain("t(lang, 'setupOneDisclaimer')");
    expect(quick).toContain('oneClickBootstrap');
  });

  it('does not ship the old multi-step 18+ checkbox flow', () => {
    expect(quick).not.toContain('entry-gate-18-continue');
    expect(quick).not.toContain('entry-gate-test-sound');
  });

  it('setupOne strings exist in every shipped language', () => {
    for (const { id } of LANGS) {
      expect(t(id, 'setupOneTitle')).toBeTruthy();
      expect(t(id, 'setupOneDisclaimer')).toBeTruthy();
    }
  });
});

describe('RequireEntryGate — the protected screen never leaks', () => {
  it('emits only the boot blocker, never the children', () => {
    const html = renderToStaticMarkup(
      <RequireEntryGate>
        <p>SECRET-ROOM-CONTENT</p>
      </RequireEntryGate>,
    );
    expect(html).toContain('entry-gate-boot');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('SECRET-ROOM-CONTENT');
  });
});
