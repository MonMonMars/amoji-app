import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SelectionBoard.tsx'), 'utf8');

describe('SelectionBoard background alt a11y', () => {
  it('names background preview images from scene title', () => {
    expect(src).toContain('src={assetUrl(b.image)}');
    expect(src).toContain('alt={t(lang, b.nameKey as never)}');
    expect(src).not.toMatch(/src=\{assetUrl\(b\.image\)\}[\s\S]{0,80}alt=""/);
  });

  it('keeps ArcFan background labels + main landmark', () => {
    expect(src).toContain('label={(b) => `${backgroundLetter(b.id)} ${t(lang, b.nameKey as never)}`}');
    expect(src).toContain('aria-labelledby="amoji-selection-title"');
  });
});
