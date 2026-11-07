import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/thumb-bake/page.tsx'), 'utf8');

describe('thumb-bake studio labels localized a11y', () => {
  it('localizes studio/canvas/log via THUMB_COPY[lang]', () => {
    expect(src).toContain("import { CHARACTERS, loadPrefs, type Lang } from '../../lib/prefs'");
    expect(src).toContain('const THUMB_COPY: Record<Lang, { studio: string; canvas: string; log: string }>');
    expect(src).toContain("studio: '縮圖烘焙工作室'");
    expect(src).toContain("canvas: 'アバター焼成キャンバス'");
    expect(src).toContain('const copy = THUMB_COPY[loadPrefs().lang] ?? THUMB_COPY.en');
    expect(src).toContain('aria-label={copy.studio}');
    expect(src).toContain('aria-label={copy.canvas}');
    expect(src).toContain('aria-label={copy.log}');
    expect(src).toContain('{copy.studio}');
    expect(src).not.toContain('aria-label="Thumb Bake Studio"');
    expect(src).not.toContain('aria-label="Avatar bake canvas"');
    expect(src).not.toContain('aria-label="Bake progress log"');
  });
});
