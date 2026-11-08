import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panel = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');

describe('mic VAD must not kill companion TTS via speaker echo', () => {
  it('guards VAD barge-in with isSpeaking / speechPending', () => {
    // Symptom: greeting works; after mic opens, every reply goes silent.
    // Cause: Silero onSpeechStart heard her own speakers and called stopSpeaking().
    const vadStart = panel.indexOf('void startVad({');
    expect(vadStart).toBeGreaterThan(0);
    const vadBlock = panel.slice(vadStart, panel.indexOf('}).then((vadHandle)', vadStart));
    expect(vadBlock).toMatch(/!isSpeaking\(\)\s*&&\s*!speechPending\(\)/);
    // Still allowed to cut when she is idle (leftover audio / true barge-in path).
    expect(vadBlock).toContain('stopSpeaking()');
  });

  it('keeps Web Speech onSpeechStart as the live barge-in while she talks', () => {
    const listenStart = panel.indexOf('listenContinuous(lang,');
    const listenBlock = panel.slice(listenStart, panel.indexOf('void startVad({', listenStart));
    expect(listenBlock).toMatch(/onSpeechStart:\s*\(\)\s*=>\s*\{[\s\S]*?stopSpeaking\(\)/);
    // ASR barge-in is not gated on isSpeaking — user words must always cut her.
    expect(listenBlock).not.toMatch(/onSpeechStart:[\s\S]*!isSpeaking\(\)/);
  });
});
