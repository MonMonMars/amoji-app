import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/selectors.tsx'), 'utf8');

describe('CharacterGrid / BackgroundGrid type=button', () => {
  it('CharacterGrid cards are type=button with aria-pressed', () => {
    const i = src.indexOf('export function CharacterGrid');
    const j = src.indexOf('export function BackgroundGrid');
    const slice = src.slice(i, j);
    expect(slice).toContain('type="button"');
    expect(slice).toContain('aria-pressed={active}');
  });

  it('BackgroundGrid cards are type=button with aria-pressed', () => {
    const i = src.indexOf('export function BackgroundGrid');
    const j = src.indexOf('export function LangCardFace');
    const slice = src.slice(i, j);
    expect(slice).toContain('type="button"');
    expect(slice).toContain('aria-pressed={active}');
  });
});
