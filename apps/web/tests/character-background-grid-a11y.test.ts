import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/selectors.tsx'), 'utf8');

describe('CharacterGrid / BackgroundGrid aria-labels', () => {
  it('CharacterGrid group + name aria-label on each card', () => {
    const i = src.indexOf('export function CharacterGrid');
    const j = src.indexOf('export function BackgroundGrid');
    const slice = src.slice(i, j);
    expect(slice).toContain('role="group"');
    expect(slice).toContain('aria-label="Character"');
    expect(slice).toContain('aria-label={c.name}');
    expect(slice).toContain('aria-pressed={active}');
    expect(slice).toContain('type="button"');
  });

  it('BackgroundGrid group + localized name aria-label on each card', () => {
    const i = src.indexOf('export function BackgroundGrid');
    const j = src.indexOf('export function LangCardFace');
    const slice = src.slice(i, j);
    expect(slice).toContain('role="group"');
    expect(slice).toContain('aria-label="Background"');
    expect(slice).toContain('aria-label={t(lang, b.nameKey as never)}');
    expect(slice).toContain('aria-pressed={active}');
    expect(slice).toContain('type="button"');
  });
});
