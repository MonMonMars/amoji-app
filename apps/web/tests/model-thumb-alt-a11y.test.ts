import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/ModelThumb.tsx'), 'utf8');

describe('ModelThumb portrait alt a11y', () => {
  it('names poster images from the character name prop', () => {
    expect(src).toContain('src={poster}');
    expect(src).toContain('alt={name}');
    expect(src).not.toMatch(/src=\{poster\}[\s\S]{0,40}alt=""/);
  });

  it('keeps initial-letter fallback when no poster loads', () => {
    expect(src).toContain('name.trim().charAt(0).toUpperCase()');
  });
});
