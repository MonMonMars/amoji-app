import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('chat mic auto-on + external audio duck', () => {
  it('opens voice mode on chat enter when mic is not blocked', () => {
    const chat = read('components/ChatPanel.tsx');
    expect(chat).toContain('micAutoArmedRef');
    expect(chat).toContain('beginVoiceMode');
    expect(chat).toContain('cutCompanion: false');
    expect(chat).toContain('micPreflightGrantedThisSession');
    expect(chat).toMatch(/micDelay[\s\S]*?beginVoiceMode\(\{ cutCompanion: false \}\)/);
    expect(chat).toMatch(/preflight[\s\S]*?\? 0/);
    expect(chat).toContain("rec?.mic === 'denied'");
    // Must not wait for open cheer before arming the mic.
    expect(chat).not.toMatch(/micDelay[\s\S]*?OPEN_CHEER_MS/);
    expect(chat).toContain('micOpenedThisMountRef');
  });

  it('gate Enter re-probes mic in the same gesture for default-open chat', () => {
    const gate = read('components/PreChatAudioGate.tsx');
    expect(gate).toContain('requestMic');
    expect(gate).toContain('setMicPreflightSession(true)');
    // Enter path must await requestMic (gesture-tied), not only read prior state.
    const enterIdx = gate.indexOf('const enter = useCallback');
    const enterBlock = gate.slice(enterIdx, enterIdx + 1200);
    expect(enterBlock).toContain('await requestMic()');
    expect(enterBlock).toContain('setMicPreflightSession(true)');
  });

  it('routes companion TTS through playback while mic keeps play-and-record', () => {
    const focus = read('lib/voice-chat-focus.ts');
    expect(focus).toContain("play-and-record");
    expect(focus).toContain('companionPlaybackSession');
    expect(focus).toContain('pauseForeignPageMedia');
    expect(focus).toContain('bindVoiceChatFocusLifecycle');
    expect(read('lib/voice.ts')).toContain('duckExternalAudioForCompanion');
    expect(read('lib/voice.ts')).toContain('primeDefaultSpeakerBeforeSynth');
  });
});
