import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash/home describedby residual a11y', () => {
  it('keeps tagline + revision describedby ids', () => {
    expect(src).toContain('aria-describedby="amoji-splash-tagline amoji-splash-revision amoji-splash-legal"');
    expect(src).toContain('id="amoji-splash-tagline"');
    expect(src).toContain('id="amoji-splash-revision"');
  });

  it('keeps titled landmark and Start label', () => {
    expect(src).toContain('aria-labelledby="amoji-splash-title"');
    expect(src).toContain('aria-label={startLabel}');
  });
});
