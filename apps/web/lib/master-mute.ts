'use client';
// Master mute: silence ALL speaker output (TTS, SFX, poke, um fillers, BGM,
 // ambient, performance clips). Independent of the mic button and of the
 // Settings "Voice replies" toggle. Persists in localStorage across pages.
 // Top-left StatusPlate / Exit stays exit — Mute is a separate control.

const MUTE_KEY = 'amoji.mute.v1';
const EVENT = 'amoji:master-mute';

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

/** Stop anything currently audible. Safe to call from any module. */
export async function silenceAllOutputs(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { stopSpeaking } = await import('./voice');
    stopSpeaking();
  } catch { /* ignore */ }
  try {
    const { stopMusic, stopPiano, endPerformanceMusic } = await import('./music');
    endPerformanceMusic();
    stopMusic();
    stopPiano();
  } catch { /* ignore */ }
  try {
    const { ambientStop } = await import('./sfx');
    ambientStop();
  } catch { /* ignore */ }
  try {
    document.querySelectorAll('audio, video').forEach((el) => {
      const media = el as HTMLMediaElement;
      try { media.pause(); } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
}

export function setMasterMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? 'on' : 'off');
  } catch { /* ignore */ }
  emit(muted);
  if (muted) void silenceAllOutputs();
}

export function toggleMasterMute(): boolean {
  const next = !isMasterMuted();
  setMasterMuted(next);
  return next;
}