import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StorySetupPanel.tsx'), 'utf8');

describe('StorySetupPanel scene-background alt a11y', () => {
  it('names the scene hero image from the scene title', () => {
    expect(src).toContain('src={assetUrl(background.image)}');
    expect(src).toContain('alt={scene.title[lang]}');
    expect(src).not.toMatch(/src=\{assetUrl\(background\.image\)\}[\s\S]{0,60}alt=""/);
  });

  it('keeps cast portrait alt + main landmark from #198', () => {
    expect(src).toContain('alt={character.name}');
    expect(src).toContain('aria-labelledby="amoji-story-setup-title"');
  });
});
