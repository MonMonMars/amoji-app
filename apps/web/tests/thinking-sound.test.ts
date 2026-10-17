import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THINKING_GAIN, stopThinkingSound, thinkingAudibleGain } from '../lib/thinking-sound';

describe('thinking sound', () => {
  it('stays quiet when voice or sfx is muted, and stays under the reply', () => {
    expect(thinkingAudibleGain(false, true, 1, 1)).toBe(0);
    expect(thinkingAudibleGain(true, false, 1, 1)).toBe(0);
    expect(thinkingAudibleGain(true, true, 1, 1)).toBe(THINKING_GAIN);
    expect(THINKING_GAIN).toBeLessThan(0.5);
    expect(thinkingAudibleGain(true, true, 0.4, 1)).toBeCloseTo(0.4 * THINKING_GAIN);
    expect(thinkingAudibleGain(true, true, 1, 0.2)).toBeCloseTo(0.2 * THINKING_GAIN);
  });

  it('ships a tiny local wav and stop is safe with no clip', () => {
    const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/sfx/thinking.wav');
    const buf = fs.readFileSync(file);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(buf.length).toBeLessThan(80_000);
    expect(() => stopThinkingSound()).not.toThrow();
  });
});