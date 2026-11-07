import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const sheet = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet memory-type chips a11y', () => {
  it('exposes preference/event/plan chips as pressed toggles', () => {
    expect(sheet).toContain("(['preference', 'event', 'plan'] as MemoryType[]).map((tp) =>");
    expect(sheet).toContain('aria-pressed={newType === tp}');
    expect(sheet).toContain("onClick={() => setNewType(tp)}");
    expect(sheet).toContain("t(lang, TYPE_KEY[tp])");
  });

  it('keeps gender chips pressed pattern', () => {
    expect(sheet).toContain('aria-pressed={gender === g}');
  });
});
