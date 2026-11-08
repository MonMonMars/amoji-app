import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const redirect = readFileSync(join(__dirname, '../app/login/page.tsx'), 'utf8');
const quick = readFileSync(join(__dirname, '../components/QuickSetup.tsx'), 'utf8');

describe('login legacy path + quick setup a11y', () => {
  it('/login is a redirect landmark', () => {
    expect(redirect).toContain('data-testid="login-redirect"');
    expect(redirect).toContain("router.replace('/')");
  });

  it('quick setup labels main landmark and START', () => {
    expect(quick).toContain('aria-labelledby="amoji-setup-title"');
    expect(quick).toContain('id="amoji-setup-title"');
    expect(quick).toContain('data-testid="setup-start"');
    expect(quick).toContain("aria-label={t(lang, 'splashStart')}");
  });
});
