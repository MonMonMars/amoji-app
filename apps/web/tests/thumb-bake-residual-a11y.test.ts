import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/thumb-bake/page.tsx'), 'utf8');

describe('thumb-bake residual a11y', () => {
  it('keeps gate + studio main landmarks', () => {
    expect(src).toContain('aria-label={copy.studio}');
    expect(src).toContain('aria-labelledby="amoji-thumb-bake-title"');
  });

  it('exposes bake status, canvas, and live progress log', () => {
    expect(src).toContain('role="status"');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('role="img"');
    expect(src).toContain('aria-label={copy.canvas}');
    expect(src).toContain('role="log"');
    expect(src).toContain('aria-relevant="additions"');
    expect(src).toContain('aria-label={copy.log}');
  });
});
