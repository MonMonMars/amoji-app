import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const sheet = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('SettingsSheet Toggle switch labels', () => {
  it('Toggle role=switch exposes aria-label (visible span alone is not enough)', () => {
    expect(sheet).toMatch(/function Toggle\([\s\S]*?label: string/);
    expect(sheet).toContain('role="switch"');
    expect(sheet).toContain('aria-label={label}');
  });

  it('every Settings switch passes a translated label', () => {
    // r2026-11-08: 'kidMode' left this list with the adult-only decision.
    for (const key of ['muteAll', 'voiceReplies', 'neuralVoice', 'openaiVoice'] as const) {
      expect(sheet).toContain(`label={t(lang, '${key}')}`);
    }
    const toggles = sheet.match(/<Toggle[\s\S]*?\/>/g) || [];
    expect(toggles.length).toBeGreaterThanOrEqual(4);
    for (const t of toggles) {
      expect(t).toContain('label=');
    }
  });
});
