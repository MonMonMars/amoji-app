import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THINKING_GAIN,
  stopThinkingSound,
  thinkingAudibleGain,
  thinkingFillerPath,
} from '../lib/thinking-sound';

describe('thinking sound', () => {
  it('stays quiet when voice or sfx is muted, and stays under the reply', () => {
    expect(thinkingAudibleGain(false, true, 1, 1)).toBe(0);
    expect(thinkingAudibleGain(true, false, 1, 1)).toBe(0);
    expect(thinkingAudibleGain(true, true, 1, 1)).toBe(THINKING_GAIN);
    expect(THINKING_GAIN).toBeLessThan(0.5);
    expect(thinkingAudibleGain(true, true, 0.4, 1)).toBeCloseTo(0.4 * THINKING_GAIN);
    expect(thinkingAudibleGain(true, true, 1, 0.2)).toBeCloseTo(0.2 * THINKING_GAIN);
  });

  it('uses long UM fillers instead of thinking.wav', () => {
    expect(thinkingFillerPath('female', 'yue')).toMatch(/\/voice-clips\/yue\/female\/um_long/);
    expect(thinkingFillerPath('male', 'yue')).toMatch(/\/voice-clips\/yue\/male\/um_long/);
    const yueF = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../public/voice-clips/yue/female/um_long.mp3',
    );
    expect(fs.existsSync(yueF)).toBe(true);
    expect(fs.statSync(yueF).size).toBeGreaterThan(1500);
    expect(() => stopThinkingSound()).not.toThrow();
  });
});
