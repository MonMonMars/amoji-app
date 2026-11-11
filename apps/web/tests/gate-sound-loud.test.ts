import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GATE_TEST_LINES } from '../lib/voice';
import { forcePlaybackVolume, getPlaybackVolume } from '../lib/playback-volume';
import { LANGS } from '../lib/prefs';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('gate speaker test — loud, clear, long', () => {
  it('GATE_TEST_LINES are multi-sentence in every language', () => {
    for (const { id } of LANGS) {
      const line = GATE_TEST_LINES[id];
      expect(line.length).toBeGreaterThan(80);
      // At least two sentence-ish breaks (period / 。 / ！ / ! / ？ / ?)
      expect((line.match(/[.!?。！？]/g) ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('forcePlaybackVolume can push element level to full loudness', () => {
    forcePlaybackVolume(1);
    expect(getPlaybackVolume()).toBe(1);
    forcePlaybackVolume(null);
  });

  it('testVoiceChain forces loud playback and uses the long gate sample', () => {
    const voice = read('lib/voice.ts');
    expect(voice).toContain('export const GATE_TEST_LINES');
    expect(voice).toContain('forcePlaybackVolume(1)');
    expect(voice).toContain('forcePlaybackVolume(null)');
    expect(voice).toContain('duckExternalAudioForCompanion()');
    expect(voice).toContain('volumeDelta: 0.45');
    expect(voice).toContain('28_000');
  });

  it('PreChatAudioGate routes to speakers before the sample', () => {
    const gate = read('components/PreChatAudioGate.tsx');
    expect(gate).toContain('companionPlaybackSession');
    expect(gate).toContain('testVoiceChain');
  });
});
