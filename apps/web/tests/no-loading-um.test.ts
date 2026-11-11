/**
 * Pixel: loading wait must stay silent — no um TTS, no recorded long-UM,
 * no thinking.wav. Visual thinking bar + Thinking pose only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadingUmSfxAllowed, thinkingFillerAllowed } from '../lib/thinking-sound';
import { criticalChatAudioPaths } from '../lib/early-audio-preload';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';
import { resolveContentMotion } from '../lib/content-motion';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('no loading um SFX', () => {
  it('gates spoken filler and recorded um SFX off', () => {
    expect(thinkingFillerAllowed()).toBe(false);
    expect(loadingUmSfxAllowed()).toBe(false);
  });

  it('voice.ts never plays recordedFillerClip for loading stubs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/voice.ts'), 'utf8');
    expect(src).not.toMatch(/recordedFillerClip\s*\(/);
    expect(src).toMatch(/if\s*\(\s*loadingFillerKind\s*\(\s*text\s*\)\s*\)\s*\{[\s\S]*?settle\(\)/);
  });

  it('does not ship thinking.wav hum', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/sfx/thinking.wav'))).toBe(false);
  });

  it('early preload skips um paths', () => {
    for (const gender of ['female', 'male'] as const) {
      const paths = criticalChatAudioPaths('yue', gender);
      expect(paths.every((p) => !/\/um(_long)?(_[a-z])?\.mp3$/i.test(p))).toBe(true);
    }
  });

  it('thinking wait resolves to Thinking pose + content motion', () => {
    expect(resolveChatAutoIdle({ assistantText: '', thinking: true })).toBe('Thinking');
    expect(resolveContentMotion({ thinking: true }).idleClip).toBe('Thinking');
  });
});
