'use client';
// Master TTS playback level (0..1) — applies to edge/gTTS/OpenAI <audio> and browser speechSynthesis.

const KEY = 'amoji.voice.volume.v1';
const DEFAULT = 0.85;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function getPlaybackVolume(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return DEFAULT;
    const n = Number.parseFloat(raw);
    return clamp01(n);
  } catch {
    return DEFAULT;
  }
}

export function setPlaybackVolume(v: number): void {
  try {
    localStorage.setItem(KEY, String(clamp01(v)));
  } catch { /* ignore */ }
}

/** Scale an HTMLMediaElement's volume by the user's master slider. */
export function applyPlaybackVolume(audio: HTMLMediaElement): void {
  audio.volume = getPlaybackVolume();
}
