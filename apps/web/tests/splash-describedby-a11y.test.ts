import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash/home describedby residual a11y', () => {
  it('describes continue control with tagline + revision', () => {
    expect(src).toContain('aria-describedby="amoji-splash-tagline amoji-splash-revision"');
    expect(src).toContain('id="amoji-splash-tagline"');
    expect(src).toContain('id="amoji-splash-revision"');
    expect(src).toContain('{APP_TAGLINE}');
    expect(src).toContain('{APP_REVISION}');
  });

  it('marks fade-out busy and keeps title/continue labels', () => {
    expect(src).toContain('aria-busy={fade}');
    expect(src).toContain('aria-labelledby="amoji-splash-title"');
    expect(src).toContain('aria-label="Continue to login"');
  });
});
