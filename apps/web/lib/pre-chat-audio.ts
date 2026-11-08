'use client';

import { isDevMode } from './dev-mode';
import { isMasterMuted, setMasterMuted } from './master-mute';

export const CHAT_AUDIO_READY_KEY = 'amoji.chatAudio.ready.v1';
export const CHAT_AUDIO_PRIOR_MUTE_KEY = 'amoji.chatAudio.priorMasterMute.v1';

export function canBypassChatAudioGate(): boolean {
  if (!isDevMode()) return false;
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('skipAudioGate') === '1' || q.get('skipAudioGate') === 'true';
  } catch {
    return false;
  }
}

export function hasChatAudioReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (canBypassChatAudioGate()) return true;
  try {
    return window.sessionStorage.getItem(CHAT_AUDIO_READY_KEY) === '1';
  } catch {
    return false;
  }
}

export function markChatAudioReady(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHAT_AUDIO_READY_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function stashPriorMasterMuteForChat(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHAT_AUDIO_PRIOR_MUTE_KEY, isMasterMuted() ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function restorePriorMasterMuteAfterChat(): void {
  if (typeof window === 'undefined') return;
  try {
    const v = window.sessionStorage.getItem(CHAT_AUDIO_PRIOR_MUTE_KEY);
    window.sessionStorage.removeItem(CHAT_AUDIO_PRIOR_MUTE_KEY);
    if (v === 'on') setMasterMuted(true);
    else if (v === 'off') setMasterMuted(false);
  } catch {
    /* ignore */
  }
}
