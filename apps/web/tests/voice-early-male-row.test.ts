import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const splash = readFileSync(join(__dirname, '../app/page.tsx'), 'utf8');
const row = readFileSync(join(__dirname, '../components/TtsVoiceRow.tsx'), 'utf8');

describe('early splash audio unlock + male voice row (Mon voice queue)', () => {
  it('splash mounts EarlyAudioUnlock before chat', () => {
    expect(splash).toContain("import EarlyAudioUnlock from '../components/EarlyAudioUnlock'");
    expect(splash).toContain('<EarlyAudioUnlock />');
  });

  it('select TTS row groups female then male in a taller grid', () => {
    expect(row).toContain("(['female', 'male'] as const)");
    expect(row).toContain('data-testid="tts-voice-grid"');
    expect(row).toContain('max-h-[12rem]');
    expect(row).toContain("data-voice-gender={button.gender}");
    expect(row).toContain('genderMale');
    expect(row).toContain('genderFemale');
  });
});
