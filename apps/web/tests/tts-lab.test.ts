import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TTS_LAB_ENGINES, ttsLabById, ttsLabPlayable } from '../lib/tts-lab';

describe('TTS lab catalog', () => {
  it('lists every research / free / backup engine for click-testing', () => {
    const ids = TTS_LAB_ENGINES.map((e) => e.id);
    for (const need of [
      'gtts',
      'speech',
      'edge',
      'qwen3-tts-wasm',
      'canto-nano',
      'ming-tts',
      'kokoro',
      'google-chirp3',
      'qwen3-tts-flash',
    ]) {
      expect(ids).toContain(need);
    }
  });

  it('marks in-app playable hops separately from demos', () => {
    const playable = ttsLabPlayable().map((e) => e.id);
    expect(playable).toEqual(expect.arrayContaining(['gtts', 'speech', 'edge']));
    expect(ttsLabById('qwen3-tts-wasm')?.audition).toBe('external');
    expect(ttsLabById('canto-nano')?.audition).toBe('canto-nano');
  });

  it('VoicePicker mounts the lab panel', () => {
    const src = readFileSync(resolve(__dirname, '../components/VoicePicker.tsx'), 'utf8');
    expect(src).toContain('TtsLabPanel');
  });

  it('lab panel has a play control per engine', () => {
    const src = readFileSync(resolve(__dirname, '../components/TtsLabPanel.tsx'), 'utf8');
    expect(src).toContain('TTS_LAB_ENGINES.map');
    expect(src).toContain('auditionTtsLabEngine');
    expect(src).toContain('ttsLabPlay');
  });
});
