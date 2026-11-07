import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('login + select START type=button', () => {
  it('login Continue and Skip are type=button', () => {
    const src = read('app/login/page.tsx');
    expect(src).toMatch(/type="button"[\s\S]*?onClick=\{go\}/);
    expect(src).toContain('type="button"');
    expect(src).toContain("'/select'");
    // r2026-11-08: first run detours through the 18+ / audio gate, so the
    // Skip button now pushes the gated path rather than a bare '/select'.
    expect(src).toContain("return hasPassedEntryGate() ? '/select' : '/gate';");
    expect(src).toMatch(/onClick=\{\(\) => \{[\s\S]*?primeAudioForChatEnter\(\)[\s\S]*?router\.push\(afterLoginPath\(\)\)/);
  });

  it('SelectionBoard START/confirm is type=button', () => {
    const src = read('components/SelectionBoard.tsx');
    expect(src).toMatch(/type="button"[\s\S]*?onClick=\{confirm\}/);
  });
});
