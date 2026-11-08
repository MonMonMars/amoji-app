import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('chat mic auto-on + external audio duck', () => {
  it('opens voice mode on chat enter when mic is not blocked', () => {
    const chat = read('components/ChatPanel.tsx');
    expect(chat).toContain('micAutoArmedRef');
    expect(chat).toContain('beginVoiceMode');
    expect(chat).toContain('shouldPlayOpenCheer');
    expect(chat).toContain('cutCompanion: false');
    expect(chat).toMatch(/micDelay[\s\S]*?beginVoiceMode\(\{ cutCompanion: false \}\)/);
    expect(chat).toContain("rec?.mic === 'denied'");
  });

  it('claims play-and-record and pauses foreign page media', () => {
    const focus = read('lib/voice-chat-focus.ts');
    expect(focus).toContain("play-and-record");
    expect(focus).toContain('pauseForeignPageMedia');
    expect(read('lib/voice.ts')).toContain('duckExternalAudioForCompanion');
  });
});
