'use client';
// Play one premade greeting or emotion clip to the end. stopVoiceClip()
// rejects the in-flight promise so the speech queue can move on only when
// the user interrupts.

import { assetUrl } from './asset';
import { pinDefaultOutput } from './audio-output';
import { applyPlaybackVolume } from './playback-volume';
import { followAudioElement, noteSpeechStarted } from './speech';

let current: HTMLAudioElement | null = null;
let rejectCurrent: ((err: Error) => void) | null = null;

export function stopVoiceClip(): void {
  const reject = rejectCurrent;
  rejectCurrent = null;
  const audio = current;
  current = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    try { audio.pause(); } catch { /* ignore */ }
    try { audio.src = ''; } catch { /* ignore */ }
  }
  if (reject) reject(new Error('canceled'));
}

/** Resolves when the file finishes. Rejects on failure or stopVoiceClip(). */
export function playVoiceClip(file: string, caption: string, onPlay?: () => void): Promise<void> {
  stopVoiceClip();
  return new Promise((resolve, reject) => {
    if (typeof Audio === 'undefined') {
      reject(new Error('no audio'));
      return;
    }
    const audio = new Audio(assetUrl(file));
    current = audio;
    pinDefaultOutput(audio);
    applyPlaybackVolume(audio);
    let settled = false;
    let stall: ReturnType<typeof setTimeout> | undefined;
    const finish = (err?: Error) => {
      if (stall) clearTimeout(stall);
      if (settled) return;
      settled = true;
      if (current === audio) current = null;
      rejectCurrent = null;
      if (err) reject(err);
      else resolve();
    };
    rejectCurrent = (err) => finish(err);
    // A 404 that never fires error/ended used to sit on the speech queue and
    // block Edge. If playback has not started, give up and let TTS talk.
    stall = setTimeout(() => finish(new Error('clip failed')), 6_000);
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error('clip failed'));
    audio.onplay = () => {
      clearTimeout(stall);
      try { noteSpeechStarted(caption || file); } catch { /* ignore */ }
      try { followAudioElement(audio, true); } catch { /* ignore */ }
      try { onPlay?.(); } catch { /* ignore */ }
    };
    void audio.play().catch((err: unknown) => {
      finish(err instanceof Error ? err : new Error(String(err)));
    });
  });
}
