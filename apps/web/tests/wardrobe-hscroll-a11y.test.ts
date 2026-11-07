import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/WardrobeSwap.tsx'), 'utf8');

describe('WardrobeSwap HScroll row labels a11y', () => {
  it('names head/outfit rows from localized COPY', () => {
    expect(src).toContain('ariaLabel={copy.head}');
    expect(src).toContain('ariaLabel={copy.body}');
    expect(src).not.toContain('ariaLabel="wardrobe heads"');
    expect(src).not.toContain('ariaLabel="wardrobe outfits"');
  });

  it('keeps FrontStill alt + dialog landmark from prior slices', () => {
    expect(src).toContain('aria-labelledby="amoji-wardrobe-title"');
    expect(src).toContain('alt={characterById(characterId).name}');
  });
});
