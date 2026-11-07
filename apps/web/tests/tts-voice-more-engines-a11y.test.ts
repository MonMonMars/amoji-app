import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const row = readFileSync(join(__dirname, '../components/TtsVoiceRow.tsx'), 'utf8');

describe('TtsVoiceRow moreEnginesLater chip a11y', () => {
  it('names the disabled more-engines placeholder chip', () => {
    expect(row).toContain('aria-disabled="true"');
    expect(row).toContain("aria-label={t(lang, 'moreEnginesLater')}");
    expect(row).toContain("t(lang, 'moreEnginesLater')");
  });

  it('keeps voice option chips labeled + pressed', () => {
    expect(row).toContain('aria-label={numLabel}');
    expect(row).toContain('aria-pressed={selected}');
  });
});
