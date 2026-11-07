import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StorySetupPanel.tsx'), 'utf8');

describe('StorySetupPanel pack-chip a11y', () => {
  it('marks pack row as labeled group', () => {
    expect(src).toContain('role="group"');
    expect(src).toContain('aria-label={LABEL.packs[lang]}');
  });

  it('labels pack + surprise chips with pressed state', () => {
    expect(src).toContain('aria-label={s.title[lang]}');
    expect(src).toContain('aria-pressed={active}');
    expect(src).toContain('aria-label={LABEL.surprise[lang]}');
    expect(src).toContain('aria-pressed={!packLocked}');
    expect(src).toContain('type="button"');
  });
});
