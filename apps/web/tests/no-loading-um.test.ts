/**
 * Pixel: loading wait must stay silent — no um TTS, no recorded long-UM,
 * no thinking.wav, no OpenAI "thinking hum" coach, no um lead clips.
 * Visual thinking bar + Thinking pose only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadingUmSfxAllowed, planThinkingSound, thinkingFillerAllowed } from '../lib/thinking-sound';
import { criticalChatAudioPaths } from '../lib/early-audio-preload';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';
import { resolveContentMotion } from '../lib/content-motion';
import { INTERJECTIONS } from '../lib/fillers';
import { emotionClipKind } from '../lib/voice-clips';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('no loading um SFX', () => {
  it('gates spoken filler and recorded um SFX off', () => {
    expect(thinkingFillerAllowed()).toBe(false);
    expect(loadingUmSfxAllowed()).toBe(false);
  });

  it('planThinkingSound is empty while filler is disabled', () => {
    expect(planThinkingSound({ lang: 'en', characterId: 'a01-shino', userText: 'hello' })).toEqual([]);
    expect(planThinkingSound({ lang: 'yue', characterId: 'a01-shino', userText: '天氣點' })).toEqual([]);
  });

  it('voice.ts never plays recordedFillerClip for loading stubs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/voice.ts'), 'utf8');
    expect(src).not.toMatch(/recordedFillerClip\s*\(/);
    expect(src).toMatch(/if\s*\(\s*filler\s*\)\s*\{\s*settle\(\);\s*return;\s*\}/);
    expect(src).toMatch(/if\s*\(\s*loadingFillerKind\s*\(\s*text\s*\)\s*\)\s*\{\s*settle\(\);\s*return;\s*\}/);
    expect(src).toMatch(/leadKind === 'um'/);
  });

  it('openai-tts never coaches a thinking-hum / um filler', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/openai-tts.ts'), 'utf8');
    expect(src).not.toMatch(/Natural thinking hum/i);
    expect(src).not.toMatch(/諗嘢嘅「嗯」/);
    expect(src).not.toMatch(/soft filler, not a word/i);
  });

  it('emotion interjections never map to um/think/search leads', () => {
    for (const [emotion, byLang] of Object.entries(INTERJECTIONS)) {
      for (const [lang, hit] of Object.entries(byLang)) {
        const text = hit?.text ?? '';
        if (!text) continue;
        const kind = emotionClipKind(text, 'lead');
        expect(
          kind === 'um' || kind === 'think' || kind === 'search',
          `${emotion}/${lang} → ${text} → ${kind}`,
        ).toBe(false);
      }
    }
  });

  it('does not ship thinking.wav hum', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/sfx/thinking.wav'))).toBe(false);
  });

  it('early preload skips um paths', () => {
    for (const gender of ['female', 'male'] as const) {
      const paths = criticalChatAudioPaths('yue', gender);
      expect(paths.every((p) => !/\/um_long(_[a-z])?\.mp3$/i.test(p))).toBe(true);
    }
  });

  it('thinking wait resolves to Thinking pose + content motion', () => {
    expect(resolveChatAutoIdle({ assistantText: '', thinking: true })).toBe('Thinking');
    expect(resolveContentMotion({ thinking: true }).idleClip).toBe('Thinking');
  });

  it('ChatPanel does not call speakThinkingFiller', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).not.toMatch(/speakThinkingFiller\s*\(/);
    expect(panel).toContain('stopThinkingSound()');
    expect(panel).toContain('setThinkingPose(true)');
  });
});
