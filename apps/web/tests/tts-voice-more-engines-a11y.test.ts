import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const row = readFileSync(join(__dirname, '../components/TtsVoiceRow.tsx'), 'utf8');

describe('TtsVoiceRow a11y + honesty', () => {
  it('no longer promises engines that cannot play', () => {
    // The disabled "More engines later" chip implied more voices were coming
    // from engines that are dead or not bundled. A disabled button that cannot
    // ever become enabled is a false promise, so it is gone.
    expect(row).not.toContain('moreEnginesLater');
  });

  it('explains a single-voice language instead of showing a dead chip', () => {
    expect(row).toContain('isSingleVoiceLocale');
    expect(row).toContain("t(lang, 'voiceOnlyOneAvailable')");
    expect(row).toContain('role="status"');
  });

  it('keeps voice option chips labeled + pressed', () => {
    expect(row).toContain('aria-label={numLabel}');
    expect(row).toContain('aria-pressed={selected}');
  });

  it('labels the row as a group with the voice heading', () => {
    expect(row).toContain('role="group"');
    expect(row).toContain('aria-labelledby="amoji-tts-voice-title"');
    expect(row).toContain("t(lang, 'chooseVoice')");
  });
});
