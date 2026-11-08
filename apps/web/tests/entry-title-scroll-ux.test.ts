import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('entry UX — one-tap title START', () => {
  it('title screen is a Start button with one-click bootstrap to /select', () => {
    const splash = read('app/page.tsx');
    expect(splash).toContain('data-testid="splash-start"');
    expect(splash).toContain('oneClickBootstrap');
    expect(splash).not.toContain('setTimeout(() => router.push');
  });

  it('fallback gate + quick setup expose back and a single START', () => {
    const quick = read('components/QuickSetup.tsx');
    expect(quick).toContain('data-testid="setup-back"');
    expect(quick).toContain('data-testid="setup-start"');
    expect(quick).toContain('oneClickBootstrap');
    expect(read('app/login/page.tsx')).toContain('login-redirect');
  });

  it('LegalGate stays off title/setup so START is the only accept tap', () => {
    const legal = read('components/LegalGate.tsx');
    expect(legal).toContain('ONE_CLICK_PATHS');
    expect(legal).toContain("'/'");
  });
});
