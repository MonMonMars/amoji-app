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

  it('exposes keyboard-activatable continue control', () => {
    expect(src).toContain('aria-label={continueLogin}');
    expect(src).toContain('role="button"');
    expect(src).toContain('tabIndex={0}');
    expect(src).toContain("e.key === 'Enter' || e.key === ' '");
    expect(src).toContain("router.push('/login')");
  });
});
