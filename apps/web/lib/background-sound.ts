'use client';
// Settings → 🔊 Voice → "Background sound": a hard Mute for NON-SPEECH audio.
//
// Owner ask (2026-11-24): "add a button at the setting page, allow user mute
// the background sound." What he was hearing and could not turn off:
//   • the procedural backing band + Karplus-Strong piano (lib/music.ts),
//   • the premade song-bed / stream loops ("song-bed/*") — dance + sing beds,
//   • the ambient scene beds (rain, fire, wind, crickets… in lib/sfx.ts).
//
// Scope is deliberately the BACKGROUND layer only. Her spoken voice is a
// different sound system end to end (gTTS / Edge / the browser's built-in
// speech engine, via lib/voice.ts) and is never touched here — that is what
// "Mute all" (lib/master-mute.ts) is for. One-shot foley (poke, giggle, UI
// tick) and the Settings volume steps also stay: they are short effects tied
// to something the user just did, not a sound that plays on its own.
//
// Shape of the module follows master-mute.ts on purpose — one persisted
// localStorage flag, one CustomEvent so already-playing loops duck inside the
// click, and appliers in the audio engines that read the flag:
//   • music.ts  → applyBackgroundSoundMute()  (band, piano, song-bed, stream)
//   • sfx.ts    → applyAmbientMute()          (scene bed)
// Default is UNMUTED, i.e. today's behaviour: nobody's app changes sound
// until they turn this on.

const KEY = 'amoji.bgm-mute.v1';
const EVENT = 'amoji:background-sound';

export function isBackgroundSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

/** Undefined-safe read for callers that can run during SSR. */
export function backgroundSoundOnFactor(): number {
  return isBackgroundSoundMuted() ? 0 : 1;
}

/** Same-tab CustomEvent + cross-tab `storage` — mirrors master-mute. */
export function subscribeBackgroundSound(cb: (muted: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onCustom = (e: Event) => {
    const d = (e as CustomEvent).detail as { muted?: boolean } | undefined;
    cb(typeof d?.muted === 'boolean' ? d.muted : isBackgroundSoundMuted());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb(isBackgroundSoundMuted());
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

/**
 * Persist + announce. The event fires before anything else so live loops duck
 * inside the same click that toggled the switch.
 */
export function setBackgroundSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, muted ? 'on' : 'off');
  } catch { /* storage blocked — the toggle still lasts for this page */ }
  emit(muted);
}

export function toggleBackgroundSoundMuted(): boolean {
  const next = !isBackgroundSoundMuted();
  setBackgroundSoundMuted(next);
  return next;
}
