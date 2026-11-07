import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const splash = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');
const row = readFileSync(join(__dirname, '../components/TtsVoiceRow.tsx'), 'utf8');

describe('early splash audio unlock + honest voice row (Mon voice queue)', () => {
  it('splash mounts EarlyAudioUnlock before chat', () => {
    expect(splash).toContain("import EarlyAudioUnlock from '../components/EarlyAudioUnlock'");
    expect(splash).toContain('<EarlyAudioUnlock />');
  });

  it('keeps the select TTS row in one shared grid with no inner scroller', () => {
    expect(row).toContain('data-testid="tts-voice-grid"');
    // Mon: no inner scrollbar — the select board owns the only vertical scroller.
    expect(row).not.toContain('max-h-[12rem]');
    expect(row).not.toContain('overflow-y-auto');
    // Every real voice the language has is shown, with no gender sub-headings:
    // the live voices are not gendered, so a male/female split would label a
    // difference the audio does not have.
    expect(row).toContain('selectTtsButtons(lang)');
    expect(row).toContain("data-voice-id={button.id}");
    expect(row).not.toContain("(['female', 'male'] as const)");
    expect(row).not.toContain('genderMale');
    expect(row).not.toContain('genderFemale');
  });
});
