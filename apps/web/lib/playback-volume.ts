'use client';
// Dialogue / TTS level (0.2–1) from the settings steps 20/40/60/80/100.
// Stored on prefs as voiceVol. Mic state does not touch this.

import { volumeLinear } from './audio-levels';

export function getPlaybackVolume(): number {
  return volumeLinear('voiceVol');
}

/** @deprecated levels are saved on prefs.voiceVol. Kept so old callers compile. */
export function setPlaybackVolume(_v: number): void {
  /* prefs own the level */
}

/** Scale an HTMLMediaElement's volume by the user's master slider. */
export function applyPlaybackVolume(audio: HTMLMediaElement): void {
  audio.volume = getPlaybackVolume();
}
