'use client';
/**
 * Best-effort "voice chat owns the speaker" — like Grok voice mode.
 * Browsers cannot pause Spotify/YouTube in other tabs; activating
 * play-and-record plus an open mic often makes the OS duck them. We also
 * pause any stray <audio>/<video> on this page (not marked amoji-owned).
 */

const PAUSED_MARK = 'data-amoji-paused-foreign';

type AudioSessionNav = Navigator & {
  audioSession?: { type: string };
};

export function enterVoiceChatAudioSession(): void {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = 'play-and-record';
  } catch { /* ignore */ }
}

export function leaveVoiceChatAudioSession(): void {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch { /* ignore */ }
}

function isAmojiMedia(el: HTMLMediaElement): boolean {
  return el.dataset.amojiAudio === '1' || el.closest('[data-amoji-audio-root]') != null;
}

/** Pause non-Amoji media on this document (embedded players on the same page). */
export function pauseForeignPageMedia(): void {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('audio, video')) {
    if (!(el instanceof HTMLMediaElement) || isAmojiMedia(el)) continue;
    if (el.paused) continue;
    try {
      el.setAttribute(PAUSED_MARK, '1');
      el.pause();
    } catch { /* ignore */ }
  }
}

/**
 * Companion TTS should use the default speakers, not the communications
 * endpoint Windows selects under play-and-record. Mic mode still calls
 * enterVoiceChatAudioSession() when recording actually starts.
 */
export function companionPlaybackSession(): void {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch { /* ignore */ }
}

/** Called when companion TTS starts — duck in-page media; route playback to default. */
export function duckExternalAudioForCompanion(): void {
  companionPlaybackSession();
  pauseForeignPageMedia();
}
