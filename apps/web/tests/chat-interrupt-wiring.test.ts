import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('chat interrupt wiring', () => {
  it('stopSpeakingForInterrupt bundles voice + motion + performance', () => {
    const voice = fs.readFileSync(path.join(ROOT, 'lib/voice.ts'), 'utf8');
    const fn = voice.slice(voice.indexOf('export function stopSpeakingForInterrupt'), voice.indexOf('export function stopSpeakingForCardAudition'));
    expect(fn).toContain('stopSpeaking()');
    expect(fn).toContain('clearMove()');
    expect(fn).toContain('endPerformanceMusic()');
  });

  it('ChatPanel send and mic barge-in use stopSpeakingForInterrupt', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    const send = panel.slice(panel.indexOf('const send = async'), panel.indexOf('const beginVoiceMode = async'));
    expect(send).toContain('stopSpeakingForInterrupt()');
    expect(send).toContain('resolveChatInterruptOnSend');
    expect(send).toContain('interrupt.newTopic');
    expect(send).toContain('sendGenRef');
    expect(panel).toMatch(/onSpeechStart:[\s\S]*?stopSpeakingForInterrupt\(\)/);
  });
});
