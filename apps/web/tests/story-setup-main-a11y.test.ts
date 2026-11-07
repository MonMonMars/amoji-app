import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StorySetupPanel.tsx'), 'utf8');

describe('StorySetupPanel main landmark a11y', () => {
  it('labels main via scene title h1', () => {
    expect(src).toContain('aria-labelledby="amoji-story-setup-title"');
    expect(src).toContain('id="amoji-story-setup-title"');
    expect(src).toContain('{scene.title[lang]}');
    expect(src).toContain('aria-busy={!prefsReady}');
  });

  it('names the cast portrait and keeps pack/start labels', () => {
    expect(src).toContain('alt={character.name}');
    expect(src).toContain('aria-label={LABEL.start[lang]}');
    expect(src).toContain('role="group"');
  });
});
