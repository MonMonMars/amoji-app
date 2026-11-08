'use client';
import { listenSupported } from './listen';
import type { MicOutcome } from './entry-gate';

/** Lightweight getUserMedia probe — stop tracks immediately. Call only from a user gesture. */
export async function requestMic(): Promise<MicOutcome> {
  if (!listenSupported()) return 'unsupported';
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!md?.getUserMedia) return 'unsupported';
  try {
    const stream = await md.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
}
