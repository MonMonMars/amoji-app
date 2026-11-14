import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StorySetupPanel.tsx'), 'utf8');

describe('StorySetupPanel scene-background alt a11y', () => {
  it('names the large cast portrait as the hero', () => {
    expect(src).toContain('data-testid="story-hero"');
    expect(src).toContain('src={assetUrl(character.image)}');
    expect(src).toContain('alt={character.name}');
    expect(src).toContain('aspect-[3/4]');
  });

  it('keeps the scene backdrop as a small labeled inset', () => {
    expect(src).toContain('data-testid="story-scene-inset"');
    expect(src).toContain('src={assetUrl(background.image)}');
    expect(src).toContain('alt={scene.title[lang]}');
    expect(src).toContain('h-[4.25rem] w-[5.75rem]');
    expect(src).not.toMatch(/src=\{assetUrl\(background\.image\)\}[\s\S]{0,60}alt=""/);
  });

  it('keeps main landmark from #198', () => {
    expect(src).toContain('aria-labelledby="amoji-story-setup-title"');
  });
});
