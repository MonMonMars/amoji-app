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

  it('i18n for pre-chat strings', () => {
    const keys: StrKey[] = ['preChatGateTitle', 'preChatGateLead', 'preChatEnterChat', 'preChatUnmuteHint', 'preChatSoundOk'];
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
