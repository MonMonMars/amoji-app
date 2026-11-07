import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('selftest / en-sfx-ab main a11y', () => {
  it('labels selftest main via titled h1', () => {
    const src = read('app/selftest/page.tsx');
    expect(src).toContain('aria-labelledby="amoji-selftest-title"');
    expect(src).toContain('id="amoji-selftest-title"');
    expect(src).toContain('Amoji self-test');
  });

  it('labels en-sfx-ab main and select nav link', () => {
    const src = read('app/en-sfx-ab/page.tsx');
    expect(src).toContain('aria-labelledby="amoji-en-sfx-ab-title"');
    expect(src).toContain('id="amoji-en-sfx-ab-title"');
    expect(src).toContain('EN SFX sidecar A/B');
    expect(src).toContain('aria-label="Back to select"');
  });
});
