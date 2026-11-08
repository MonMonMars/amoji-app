'use client';
/**
 * START / ENTER STORY / confirm → chat: unlock speaker + optional mic preflight
 * inside the same user gesture (before ChatPanel mounts).
 */
import { patchEntryGateMic, setMicPreflightSession, type MicOutcome } from './entry-gate';
import { isMasterMuted, setMasterMuted } from './master-mute';
import { primeDefaultSpeakerBeforeSynth } from './audio-output';
import { companionPlaybackSession } from './voice-chat-focus';
import { primeAudioForChatEnter, setVoiceEnabled, voiceEnabled } from './voice';
import { requestMic } from './mic-preflight';

export function primeChatStartGesture(): void {
  try { if (isMasterMuted()) setMasterMuted(false); } catch { /* ignore */ }
  try { if (!voiceEnabled()) setVoiceEnabled(true); } catch { /* ignore */ }
  primeAudioForChatEnter();
  companionPlaybackSession();
  try { void primeDefaultSpeakerBeforeSynth(); } catch { /* ignore */ }
}

function recordMicPreflight(outcome: MicOutcome): void {
  if (outcome === 'granted') setMicPreflightSession(true);
  else setMicPreflightSession(false);
  patchEntryGateMic(outcome);
}

/** Fire-and-forget from confirm(); getUserMedia starts in the same click stack. */
export function beginMicPreflightFromGesture(): void {
  void requestMic().then(recordMicPreflight);
}
