// Non-speech wait cue. A short local hum loops while a chat request is in
// flight and stops when reply TTS starts (speak/sing) or the request fails.
// Edge and Web Speech stay the reply path. No network, no paid API.

import { assetUrl } from './asset';
import { pinDefaultOutput } from './audio-output';
import { volumeLinear } from './audio-levels';
import { sfxEnabled } from './sfx';

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

export function startThinkingSound(): void {
  if (typeof window === 'undefined') return;
  const gain = thinkingAudibleGain(
    voiceRepliesOn(),
    sfxEnabled(),
    volumeLinear('voiceVol'),
    volumeLinear('sfxVol'),
  );
  if (gain <= 0) return;
  if (!clip) {
    clip = new Audio(assetUrl('/sfx/thinking.wav'));
    clip.loop = true;
    clip.preload = 'auto';
    pinDefaultOutput(clip);
  }
  clip.volume = gain;
  if (clip.paused) {
    void clip.play().catch(() => undefined);
  }
}

export function stopThinkingSound(): void {
  if (!clip) return;
  clip.pause();
  try { clip.currentTime = 0; } catch { /* ignore */ }
}
