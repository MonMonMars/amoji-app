import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');

describe('splash decorative glow residual a11y', () => {
  it('marks the hero atmosphere as decorative', () => {
    expect(src).toContain('aria-hidden');
    expect(src).toContain('sakura.jpg');
  });

  it('keeps splash main labels from prior slices', () => {
    expect(src).toContain('aria-labelledby="amoji-splash-title"');
    expect(src).toContain('aria-describedby="amoji-splash-tagline amoji-splash-revision amoji-splash-legal"');
    expect(src).toContain('aria-label={startLabel}');
  });
});
