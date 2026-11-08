import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('entry UX — title Start, back, scroll-to-unlock', () => {
  it('title screen is a Start button, not an auto timer', () => {
    const splash = read('app/page.tsx');
    expect(splash).toContain('data-testid="splash-start"');
    expect(splash).toContain('splash-start-pulse');
    expect(splash).not.toContain('setTimeout(() => router.push');
  });

  it('login and gate steps expose a top-left back control', () => {
    expect(read('app/login/page.tsx')).toContain('data-testid="login-back"');
    const gate = read('components/EntryGate.tsx');
    expect(gate).toContain('data-testid="entry-gate-back"');
    expect(gate).toContain("send({ type: 'back' })");
  });

  it('legal Accept and adult Continue stay locked until scroll end', () => {
    const legal = read('components/LegalGate.tsx');
    expect(legal).toContain('useScrollReachedEnd');
    expect(legal).toContain('disabled={!readToEnd}');
    expect(legal).toContain("t(lang, 'legalScrollHint')");

    const gate = read('components/EntryGate.tsx');
    expect(gate).toContain('useScrollReachedEnd');
    expect(gate).toContain('!adultReadToEnd');
    expect(gate).toContain("t(lang, 'gateScrollHint')");
  });
});
