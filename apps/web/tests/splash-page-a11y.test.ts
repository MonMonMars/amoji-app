import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash/home page a11y', () => {
  it('labels main landmark via titled h1', () => {
    expect(src).toContain('aria-labelledby="amoji-splash-title"');
    expect(src).toContain('id="amoji-splash-title"');
    expect(src).toContain('{APP_NAME}');
  });

  it('exposes an explicit Start control (no auto-advance)', () => {
    expect(src).toContain('data-testid="splash-start"');
    expect(src).toContain("t(lang, 'splashStart')");
    expect(src).toContain('oneClickBootstrap');
    expect(src).toContain("router.push('/select')");
    expect(src).not.toContain('setTimeout');
    expect(src).not.toContain('role="button"');
  });
});
