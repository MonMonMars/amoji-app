import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Live Pages (/amoji-app): story setup painted <img src="/backgrounds/...">
// which 404s at github.io root. SceneBackdrop already uses assetUrl; story
// must too. Character portraits are mostly absolute https (pass-through) but
// wrap for consistency / future local stills.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../app/story/page.tsx'), 'utf8');

describe('story page Pages basePath assets', () => {
  it('imports assetUrl', () => {
    expect(src).toMatch(/import\s*\{\s*assetUrl\s*\}\s*from\s*['\"]\.\.\/\.\.\/lib\/asset['\"]/);
  });

  it('does not paint bare background.image / character.image src', () => {
    expect(src).not.toMatch(/src=\{background\.image\}/);
    expect(src).not.toMatch(/src=\{character\.image\}/);
  });

  it('prefixes story hero + cast chip imgs via assetUrl', () => {
    expect(src).toMatch(/src=\{assetUrl\(background\.image\)\}/);
    expect(src).toMatch(/src=\{assetUrl\(character\.image\)\}/);
  });
});