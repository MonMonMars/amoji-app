import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PANEL = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');

describe('chat mic voice final while busy', () => {
  it('queues voice finals into send() instead of the composer when busy', () => {
    expect(PANEL).toContain('voiceTurnQueueRef');
    expect(PANEL).toContain('enqueueVoiceTurn');
    expect(PANEL).toContain('flushVoiceTurnQueue');
    const begin = PANEL.slice(
      PANEL.indexOf('const beginVoiceMode'),
      PANEL.indexOf('const toggleMic'),
    );
    expect(begin).toContain('enqueueVoiceTurn(said)');
    expect(begin).not.toMatch(/busyRef\.current\)[\s\S]{0,40}setInput/);
    const done = PANEL.slice(PANEL.indexOf('const done = () => {'), PANEL.indexOf('setCrisisCard(true)'));
    expect(done).toContain('flushVoiceTurnQueue()');
    const finallyBlock = PANEL.slice(PANEL.lastIndexOf('} finally {'), PANEL.indexOf('// ChatGPT-style hero mic'));
    expect(finallyBlock).toContain('flushVoiceTurnQueue()');
  });

  it('send() gates on busyRef so flushVoiceTurnQueue is not dropped by stale React busy', () => {
    const sendBlock = PANEL.slice(
      PANEL.indexOf('const send = async'),
      PANEL.indexOf('const beginVoiceMode'),
    );
    expect(sendBlock).toContain('busyRef.current');
    expect(sendBlock).not.toMatch(/if \(!text \|\| busy\)/);
  });
});