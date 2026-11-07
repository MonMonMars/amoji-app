import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StorySetupPanel.tsx'), 'utf8');

describe('StorySetupPanel start/reroll a11y', () => {
  it('labels reroll/cast-again control from pack lock state', () => {
    expect(src).toContain('data-testid="story-reroll"');
    expect(src).toContain('aria-label={packLocked ? LABEL.castAgain[lang] : LABEL.reroll[lang]}');
    expect(src).toContain('type="button"');
  });

  it('labels ENTER STORY start control', () => {
    expect(src).toContain('data-testid="story-start"');
    expect(src).toContain('aria-label={LABEL.start[lang]}');
    expect(src).toContain('type="button"');
  });
});
