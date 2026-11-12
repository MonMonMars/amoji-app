'use client';
// Play one premade greeting or emotion clip to the end. stopVoiceClip()
// rejects the in-flight promise so the speech queue can move on only when
// the user interrupts.

import { assetUrl } from './asset';
import { pinDefaultOutput, pinDefaultOutputAsync } from './audio-output';
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

/** True while a gesture/insurance clip is the active element. */
export function isVoiceClipPlaying(): boolean {
  const audio = current;
  if (!audio) return false;
  return !audio.paused && !audio.ended && audio.currentTime > 0;
}

/**
 * Same-origin clip started INSIDE a user gesture.
 * Must call `audio.play()` in the same turn as the tap — awaiting
 * `setSinkId` / `pinDefaultOutputAsync` first drops activation on Chrome and
 * leaves card greets silent when hosted gTTS is blocked.
 *
 * Do NOT call `pinDefaultOutput` before the first play: that kicks off async
 * `setSinkId`, which races and can reject the gesture-bound play() on Chrome.
 * Pin after playback starts (or only before a retry).
 */
export function playGestureClipSync(file: string, caption: string, onPlay?: () => void): void {
  stopVoiceClip();
  if (typeof Audio === 'undefined') return;
  const audio = new Audio(assetUrl(file));
  current = audio;
  applyPlaybackVolume(audio);
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    if (current === audio) current = null;
    rejectCurrent = null;
  };
  rejectCurrent = () => finish();
  audio.onended = () => finish();
  audio.onerror = () => finish();
  audio.onplay = () => {
    // Pin after play so setSinkId never races the gesture-activated start.
    pinDefaultOutput(audio);
    try { noteSpeechStarted(caption || file); } catch { /* ignore */ }
    try { followAudioElement(audio, true); } catch { /* ignore */ }
    try { onPlay?.(); } catch { /* ignore */ }
  };
  void audio.play().catch(() => {
    // First play rejected (often sink race / autoplay). Pin, then retry once.
    void pinDefaultOutputAsync(audio)
      .then(() => audio.play())
      .catch(() => finish());
  });
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
      pinDefaultOutput(audio);
      try { noteSpeechStarted(caption || file); } catch { /* ignore */ }
      try { followAudioElement(audio, true); } catch { /* ignore */ }
      try { onPlay?.(); } catch { /* ignore */ }
    };
    // Prefer gesture-safe play first; sink pin only on retry / after start.
    void audio.play().catch((err: unknown) => {
      void pinDefaultOutputAsync(audio)
        .then(() => audio.play())
        .catch((e: unknown) => {
          finish(e instanceof Error ? e : err instanceof Error ? err : new Error(String(e)));
        });
    });
  });
}
