'use client';
import { listenSupported } from './listen';
import type { MicOutcome } from './entry-gate';
import { waitForVadRelease } from './vad';

/** Lightweight getUserMedia probe — stop tracks immediately. Call only from a user gesture. */
export async function requestMic(): Promise<MicOutcome> {
  if (!listenSupported()) return 'unsupported';
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!md?.getUserMedia) return 'unsupported';
  try {
    const stream = await md.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    stream.getTracks().forEach((track) => {
      try { track.stop(); } catch { /* ignore */ }
    });
    return 'granted';
  } catch {
    return 'denied';
  }
}

/**
 * Re-acquire + release the mic inside a click so chat voice mode can start
 * again after the user turned it off (stale tracks / play-and-record latch).
 */
export async function reacquireMicForVoiceMode(): Promise<MicOutcome> {
  // Start getUserMedia in this turn so iPhone keeps the tap gesture.
  // Awaiting VAD destroy first (~80ms) dropped Safari's activation and
  // the button returned denied with no prompt.
  const probe = requestMic();
  await waitForVadRelease();
  return probe;
}
