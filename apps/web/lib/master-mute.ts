'use client';
// Master mute: silence ALL speaker output (TTS, SFX, poke, um fillers, BGM,
// ambient, performance clips). Independent of the mic button and of the
// Settings "Voice replies" toggle. Persists in localStorage across pages.
// Top-left StatusPlate / Exit stays exit — Mute is a separate control.
// t719: unmute must restore engines; in-flight silenceAllOutputs must not
// keep killing audio after the user turns mute off.
// Residual (t719 follow-up): restore that awaits dynamic import() loses the
// unmute click's user gesture, so Chrome/Edge leave HTMLAudio + AudioContext
// gated until a full refresh. Kick synth + media volume synchronously in the
// click stack; voice/sfx modules also resume on the mute CustomEvent.

import { applyPlaybackVolume } from './playback-volume';

const MUTE_KEY = 'amoji.mute.v1';
const EVENT = 'amoji:master-mute';

/** Bumped on every mute/unmute so stale async silence aborts. */
let silenceGeneration = 0;

export function isMasterMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'on';
  } catch {
    return false;
  }
}

/** Subscribe to mute changes (same-tab CustomEvent + storage from other tabs). */
export function subscribeMasterMute(cb: (muted: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onCustom = (e: Event) => {
    const d = (e as CustomEvent).detail as { muted?: boolean } | undefined;
    cb(typeof d?.muted === 'boolean' ? d.muted : isMasterMuted());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === MUTE_KEY) cb(isMasterMuted());
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

function emit(muted: boolean): void {
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { muted } }));
  } catch {
    /* ignore */
  }
}

/** Clear sticky mute/volume-0 on existing media. Sync — safe inside unmute click. */
export function restoreMediaElementsAfterUnmute(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('audio, video').forEach((el) => {
    const media = el as HTMLMediaElement;
    try {
      media.muted = false;
      applyPlaybackVolume(media);
    } catch { /* ignore */ }
  });
}

/**
 * Sync kick that must stay in the unmute gesture (no await).
 * voice/sfx listeners on the mute event do the heavy unlockAudio/resume.
 */
export function kickOutputsSyncAfterUnmute(): void {
  if (typeof window === 'undefined') return;
  if (isMasterMuted()) return;
  try {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.resume();
    }
  } catch { /* ignore */ }
  restoreMediaElementsAfterUnmute();
}

/** Stop anything currently audible. Safe to call from any module. */
export async function silenceAllOutputs(): Promise<void> {
  if (typeof window === 'undefined') return;
  const gen = silenceGeneration;
  const alive = () => gen === silenceGeneration && isMasterMuted();

  try {
    if (!alive()) return;
    const { stopSpeaking } = await import('./voice');
    if (!alive()) return;
    stopSpeaking();
  } catch { /* ignore */ }
  try {
    if (!alive()) return;
    const { stopMusic, stopPiano, endPerformanceMusic } = await import('./music');
    if (!alive()) return;
    endPerformanceMusic();
    stopMusic();
    stopPiano();
  } catch { /* ignore */ }
  try {
    if (!alive()) return;
    const { ambientStop } = await import('./sfx');
    if (!alive()) return;
    ambientStop();
  } catch { /* ignore */ }
  try {
    if (!alive()) return;
    document.querySelectorAll('audio, video').forEach((el) => {
      const media = el as HTMLMediaElement;
      try { media.pause(); } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
}

/**
 * After Mute All turns OFF: resume speechSynthesis + WebAudio so the next
 * Edge speak / SFX / clip is not stuck suspended from the silence pass.
 * Prefer kickOutputsSyncAfterUnmute() for gesture-bound work; this async path
 * is a backup after dynamic imports settle.
 */
export async function restoreOutputsAfterUnmute(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isMasterMuted()) return;
  kickOutputsSyncAfterUnmute();
  try {
    const { resumeVoiceEngines } = await import('./voice');
    if (isMasterMuted()) return;
    resumeVoiceEngines();
  } catch { /* ignore */ }
  try {
    const { resumeSfxContext } = await import('./sfx');
    if (isMasterMuted()) return;
    resumeSfxContext();
  } catch { /* ignore */ }
  // t719: silenceAllOutputs() paused every media element. Do not autoplay
  // content, but clear sticky mute/volume-0 so the next Edge/clip speak works.
  try {
    if (isMasterMuted()) return;
    restoreMediaElementsAfterUnmute();
  } catch { /* ignore */ }
}

export function setMasterMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? 'on' : 'off');
  } catch { /* ignore */ }
  // Invalidate any in-flight silence before/after the flip.
  silenceGeneration += 1;
  // Emit first so voice/sfx sync listeners unlock inside the unmute click.
  emit(muted);
  if (muted) {
    void silenceAllOutputs();
  } else {
    kickOutputsSyncAfterUnmute();
    void restoreOutputsAfterUnmute();
  }
}

export function toggleMasterMute(): boolean {
  const next = !isMasterMuted();
  setMasterMuted(next);
  return next;
}