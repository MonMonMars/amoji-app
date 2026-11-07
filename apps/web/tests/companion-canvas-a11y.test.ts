import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/CompanionCanvas.tsx'), 'utf8');

describe('CompanionCanvas character-aware aria-label a11y', () => {
  it('names the stage from the seeded character', () => {
    expect(src).toContain("aria-label={characterById(seedKey ?? '').name}");
    expect(src).not.toContain('aria-label="companion"');
    expect(src).toContain("import { characterById } from '../lib/prefs'");
  });

  it('still accepts seedKey for persona wiring', () => {
    expect(src).toContain('seedKey?: string');
    expect(src).toContain('seedKey,');
  });
});
