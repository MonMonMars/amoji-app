import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/sfx-gallery/page.tsx'), 'utf8');

describe('sfx-gallery filter tab aria-label a11y', () => {
  it('names each filter tab from its visible label', () => {
    expect(src).toContain('role="tab"');
    expect(src).toContain('aria-selected={filter === f.id}');
    expect(src).toContain('aria-label={f.label}');
    expect(src).toContain('role="tablist"');
    expect(src).toContain('aria-label="Gallery filters"');
  });

  it('keeps main + action labels from prior slices', () => {
    expect(src).toContain('aria-labelledby="amoji-sfx-gallery-title"');
    expect(src).toContain('aria-label={`Play ${clip.code}`}');
  });
});
