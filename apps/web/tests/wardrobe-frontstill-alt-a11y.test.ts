import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/WardrobeSwap.tsx'), 'utf8');

describe('WardrobeSwap FrontStill alt a11y', () => {
  it('names front-still portraits from character identity', () => {
    expect(src).toContain('function FrontStill');
    expect(src).toContain('src={assetUrl(image)}');
    expect(src).toContain('alt={characterById(characterId).name}');
    expect(src).not.toMatch(/src=\{assetUrl\(image\)\}[\s\S]{0,60}alt=""/);
  });

  it('keeps thumb pressed + name labels from prior wardrobe a11y', () => {
    expect(src).toContain('aria-pressed={pressed}');
    expect(src).toContain('aria-label={asset.name}');
  });
});
