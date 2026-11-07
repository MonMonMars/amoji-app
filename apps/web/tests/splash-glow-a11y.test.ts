import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash decorative glow residual a11y', () => {
  it('hides ambient glows and ping from the accessibility tree', () => {
    expect(src).toContain('bg-pink-500/10 blur-3xl" aria-hidden');
    expect(src).toContain('bg-indigo-500/10 blur-3xl" aria-hidden');
    expect(src).toContain('animate-ping rounded-full bg-pink-400/15" aria-hidden');
  });

  it('keeps splash main labels from prior slices', () => {
    expect(src).toContain('aria-labelledby="amoji-splash-title"');
    expect(src).toContain('aria-describedby="amoji-splash-tagline amoji-splash-revision"');
    expect(src).toContain('aria-label={continueLogin}');
  });
});
