'use client';
// Dialogue / TTS level (0.2–1) from the settings steps 20/40/60/80/100.
// Stored on prefs as voiceVol. Mic state does not touch this.

import { DEFAULT_VOLUME, volumeLinear } from './audio-levels';

export function getPlaybackVolume(): number {
  const v = volumeLinear('voiceVol');
  // A stored 0 (or a bad parse) used to mute Edge and every clip. Steps start at 20.
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_VOLUME / 100;
  return v;
}

/** @deprecated levels are saved on prefs.voiceVol. Kept so old callers compile. */
export function setPlaybackVolume(_v: number): void {
  /* prefs own the level */
}

/** Scale an HTMLMediaElement's volume by the user's master slider. */
export function applyPlaybackVolume(audio: HTMLMediaElement): void {
  const level = getPlaybackVolume();
  try {
    audio.volume = level;
  } catch {
    // Some iOS builds expose volume as read-only. Playback must still start.
  }
}
