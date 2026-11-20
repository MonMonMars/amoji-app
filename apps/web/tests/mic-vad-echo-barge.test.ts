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
    expect(vadBlock).toContain('stopSpeakingForInterrupt()');
  });

  it('does not let Web Speech cut her on speaker echo of the welcome', () => {
    const listenStart = panel.indexOf('listenContinuous(lang,');
    const listenBlock = panel.slice(listenStart, panel.indexOf('void startVad({', listenStart));
    // While she talks, onSpeechStart waits for interim text (echo often has no user words yet).
    expect(listenBlock).toMatch(/onSpeechStart:[\s\S]*isSpeaking\(\)\s*\|\|\s*speechPending\(\)/);
    expect(listenBlock).toContain('isCompanionEcho');
    expect(listenBlock).toMatch(/onFinal:[\s\S]*isCompanionEcho[\s\S]*enqueueVoiceTurn/);
    // Real user words still cut her once interim text is not her own line.
    expect(listenBlock).toMatch(/onInterim:[\s\S]*isCompanionEcho[\s\S]*stopSpeakingForInterrupt\(\)/);
  });
});
