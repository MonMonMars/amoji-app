// Non-speech wait cue while a chat request is in flight.
// Uses a short gender+lang-matched um… from CLIP_LIBRARY (not the old long
// sfx/thinking.wav). Stops when reply TTS starts or the request fails.
// A missing / never-starting clip must not block the spoken line.

import { assetUrl } from './asset';
import { pinDefaultOutput } from './audio-output';
import { volumeLinear } from './audio-levels';
import { applyPlaybackVolume } from './playback-volume';
import { sfxEnabled } from './sfx';
import { recordedFillerClip, type VoiceClipGender } from './voice-clips';
import { isMasterMuted } from './master-mute';

/** Fraction of the voice/sfx level. Keeps the hum under the reply. */
export const THINKING_GAIN = 0.32;

const VOICE_MUTE_KEY = 'amoji.voice.v1';

export function thinkingAudibleGain(
  voiceOn: boolean,
  sfxOn: boolean,
  voiceLevel: number,
  sfxLevel: number,
): number {
  if (!voiceOn || !sfxOn) return 0;
  const level = Math.min(Math.max(0, voiceLevel), Math.max(0, sfxLevel));
  return Math.min(1, level) * THINKING_GAIN;
}

function voiceRepliesOn(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(VOICE_MUTE_KEY) !== 'off';
  } catch {
    return true;
  }
}

let clip: HTMLAudioElement | null = null;
let clipKey = '';
let stallTimer: ReturnType<typeof setTimeout> | undefined;

export interface ThinkingSoundOpts {
  gender?: VoiceClipGender;
  lang?: string;
}

/** Short um path for the wait cue (CLIP_LIBRARY lang+gender um). */
export function thinkingFillerPath(gender: VoiceClipGender = 'female', lang = 'yue'): string {
  return recordedFillerClip(gender, 'um', lang);
}

export function startThinkingSound(opts: ThinkingSoundOpts = {}): void {
  if (typeof window === 'undefined') return;
  if (isMasterMuted()) return;
  const gain = thinkingAudibleGain(
    voiceRepliesOn(),
    sfxEnabled(),
    volumeLinear('voiceVol'),
    volumeLinear('sfxVol'),
  );
  if (gain <= 0) return;
  const gender = opts.gender ?? 'female';
  const lang = opts.lang ?? 'yue';
  const path = thinkingFillerPath(gender, lang);
  const key = `${gender}:${lang}:${path}`;
  if (!clip || clipKey !== key) {
    stopThinkingSound();
    clip = new Audio(assetUrl(path));
    clip.loop = true;
    clip.preload = 'auto';
    clipKey = key;
    pinDefaultOutput(clip);
  }
  try {
    applyPlaybackVolume(clip);
    clip.volume = Math.min(clip.volume, gain);
  } catch { /* iOS volume can be read-only */ }
  if (stallTimer) clearTimeout(stallTimer);
  // A 404 that never errors must not sit under the reply forever.
  stallTimer = setTimeout(() => {
    if (clip && clip.paused) stopThinkingSound();
  }, 4_000);
  if (clip.paused) {
    void clip.play().then(() => {
      if (stallTimer) clearTimeout(stallTimer);
    }).catch(() => {
      stopThinkingSound();
    });
  }
}

export function stopThinkingSound(): void {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = undefined;
  }
  if (!clip) return;
  clip.pause();
  try { clip.currentTime = 0; } catch { /* ignore */ }
}
