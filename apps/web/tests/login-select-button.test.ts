import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('title + select START type=button', () => {
  it('splash START is type=button and opens /select', () => {
    const src = read('app/page.tsx');
    expect(src).toContain('type="button"');
    expect(src).toContain('data-testid="splash-start"');
    expect(src).toContain("router.push('/select')");
    expect(src).toContain("router.push('/setup')");
  });

  it('QuickSetup fallback START is type=button', () => {
    const src = read('components/QuickSetup.tsx');
    expect(src).toContain('type="button"');
    expect(src).toContain('data-testid="setup-start"');
    expect(src).toContain('oneClickBootstrap');
  });

  it('SelectionBoard START/confirm is type=button', () => {
    const src = read('components/SelectionBoard.tsx');
    expect(src).toMatch(/type="button"[\s\S]*?onClick=\{confirm\}/);
  });
});
