import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/login/page.tsx'), 'utf8');

describe('login page main a11y', () => {
  it('labels main landmark via titled h1', () => {
    expect(src).toContain('aria-labelledby="amoji-login-title"');
    expect(src).toContain('id="amoji-login-title"');
    expect(src).toContain('{APP_NAME}');
  });

  it('labels Continue and Skip controls', () => {
    expect(src).toContain("aria-label={t(lang, 'loginCta')}");
    expect(src).toContain("aria-label={t(lang, 'loginSkip')}");
    expect(src).toContain('type="button"');
    expect(src).toContain('onClick={go}');
  });
});
