import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS, t, type StrKey } from '../lib/prefs';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('pre-chat audio gate', () => {
  it('soft-gates audio after rules; select goes straight to chat', () => {
    expect(read('app/chat/page.tsx')).toContain('RequireChatAudio');
    expect(read('components/RequireChatAudio.tsx')).toContain('markChatAudioReady');
    expect(read('components/RequireChatAudio.tsx')).not.toContain('blocked');
    expect(read('lib/pre-chat-audio.ts')).toContain('CHAT_AUDIO_READY_KEY');
    expect(read('components/SelectionBoard.tsx')).toContain("router.push('/chat')");
    expect(read('components/SelectionBoard.tsx')).not.toContain("'/gate/audio?next=/chat'");
    expect(read('components/PreChatAudioGate.tsx')).toContain("data-testid=\"pre-chat-enter-chat\"");
    expect(read('components/PreChatAudioGate.tsx')).not.toContain('disabled={!canEnter}');
    expect(read('components/QuickSetup.tsx')).toContain('/gate/audio?next=');
  });

  it('asks I can hear / I cannot hear after the sound test, with troubleshooting', () => {
    const gate = read('components/PreChatAudioGate.tsx');
    expect(gate).toContain('data-testid="pre-chat-test-sound"');
    expect(gate).toContain('data-testid="pre-chat-hear-ask"');
    expect(gate).toContain('data-testid="pre-chat-hear-yes"');
    expect(gate).toContain('data-testid="pre-chat-hear-no"');
    expect(gate).toContain('data-testid="pre-chat-hear-ok"');
    expect(gate).toContain('data-testid="pre-chat-hear-help"');
    expect(gate).toContain('data-testid="pre-chat-hear-retry"');
    expect(gate).toContain("t(lang, 'gateAudioQuestion')");
    expect(gate).toContain("t(lang, 'gateAudioYes')");
    expect(gate).toContain("t(lang, 'gateAudioNo')");
    expect(gate).toContain("t(lang, 'preChatHeardOk')");
    expect(gate).toContain("t(lang, 'gateHelpTitle')");
    expect(gate).toContain("t(lang, 'gateHelpSwitch')");
    expect(gate).toContain("t(lang, 'gateHelpVolume')");
    expect(gate).toContain("t(lang, 'gateHelpBluetooth')");
    expect(gate).toContain("t(lang, 'gateHelpTabMuted')");
    expect(gate).toContain("t(lang, 'gateHelpRetry')");
    // Re-click of Test my sound resets the hear choice.
    expect(gate).toContain("setSoundUi('asked')");
    expect(gate).toContain('setHeard(null)');
  });

  it('keeps mic allow simple and re-clickable without a typing field', () => {
    const gate = read('components/PreChatAudioGate.tsx');
    expect(gate).toContain('data-testid="pre-chat-mic-section"');
    expect(gate).toContain('data-testid="pre-chat-mic-allow"');
    expect(gate).toContain('requestMic');
    expect(gate).toContain("t(lang, 'gateMicAllow')");
    // Do not force a useless text box for this permission step.
    expect(gate).not.toMatch(/<textarea\b/);
    expect(gate).not.toMatch(/<input\b[^>]*type=["']text["']/);
    expect(gate).not.toMatch(/contentEditable/);
    const micSection = gate.slice(
      gate.indexOf('data-testid="pre-chat-mic-section"'),
      gate.indexOf('data-testid="pre-chat-enter-chat"'),
    );
    expect(micSection).not.toMatch(/<textarea\b|<input\b/);
    expect(micSection).toContain('role="status"');
    // Allow stays available after grant so re-click re-triggers the popup.
    expect(gate).toContain("mic !== 'unsupported'");
    expect(gate).not.toContain("mic !== 'granted' && mic !== 'unsupported'");
  });

  it('NEXT / enter stays always clickable', () => {
    const gate = read('components/PreChatAudioGate.tsx');
    expect(gate).toContain('data-testid="pre-chat-enter-chat"');
    expect(gate).not.toMatch(/pre-chat-enter-chat[\s\S]{0,120}disabled/);
    expect(gate).not.toContain('disabled={!canEnter}');
    expect(gate).not.toContain('disabled={!speakerOk');
  });

  it('i18n for pre-chat strings', () => {
    const keys: StrKey[] = [
      'preChatGateTitle',
      'preChatGateLead',
      'preChatEnterChat',
      'preChatUnmuteHint',
      'preChatHeardOk',
      'gateAudioQuestion',
      'gateAudioYes',
      'gateAudioNo',
      'gateHelpTitle',
      'gateHelpRetry',
      'gateMicAllow',
    ];
    for (const key of keys) {
      for (const { id } of LANGS) {
        expect(t(id, key)).toBeTruthy();
      }
    }
  });

  it('Grok-style audio focus lifecycle', () => {
    expect(read('lib/voice-chat-focus.ts')).toContain('bindVoiceChatFocusLifecycle');
    expect(read('components/ChatPanel.tsx')).toContain('bindVoiceChatFocusLifecycle');
  });
});
