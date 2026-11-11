'use client';
// Silent early warm of the chat audio stack from /select before /chat.
// Prefetches critical CLIP laugh / poke bytes + Silero VAD CDN scripts,
// creates a (possibly suspended) AudioContext, and DNS-preconnects Edge TTS.
// Does NOT play enter/cheer SFX — OPEN_CHEER_MS / THINKING_SOUND_DELAY_MS stay
// authoritative on chat mount (#90). Never prompts for mic permission.

import { assetUrl } from './asset';
import { createDefaultAudioContext, pinDefaultOutput } from './audio-output';
import { resumeSfxContext } from './sfx';
import { preloadVadRuntime } from './vad';
import { pokeZoneClipPaths, POKE_PREFETCH_ZONES, type VoiceClipGender } from './voice-clips';

/** Edge readaloud origin (wss host). Preconnect only — no audible open. */
export const EDGE_SPEECH_ORIGIN = 'https://speech.platform.bing.com';

let started = false;
let donePromise: Promise<void> | null = null;

/**
 * Critical first-talk paths. Fixed names (no rotating laugh cursors)
 * so a background warm cannot burn the next spoken pick. Only files that
 * ship under public/voice-clips (404s are tolerated but avoided).
 * Loading "um" fillers are NOT warmed — spoken wait cues are off (visual only).
 */
export function criticalChatAudioPaths(
  _lang = 'yue',
  gender: VoiceClipGender = 'female',
): string[] {
  const paths = [
    `/voice-clips/universal/${gender}/laugh.mp3`,
  ];
  if (gender === 'female') {
    paths.push(
      '/voice-clips/universal/female/wow_woven.mp3',
      '/voice-clips/universal/female/hehe.mp3',
    );
  } else {
    paths.push(
      '/voice-clips/ja/male/oh.mp3',
      '/voice-clips/universal/male/wow.mp3',
    );
  }
  // Poke is a tap on the body, so it has to answer instantly — but the zone
  // clip was being fetched only after the tap, which put the sound a beat
  // behind the recoil. Warm the zones a tap actually lands on. Deduped
  // against the paths above so nothing is fetched twice.
  for (const path of pokeZoneClipPaths(gender, POKE_PREFETCH_ZONES)) {
    if (!paths.includes(path)) paths.push(path);
  }
  return paths;
}

/** Fetch into HTTP cache; fall back to HTMLAudio preload without play(). */
export function prefetchAudioPath(path: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const url = assetUrl(path);
  return fetch(url, {
    cache: 'force-cache',
    mode: 'cors',
    credentials: 'same-origin',
  })
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    })
    .then(() => undefined)
    .catch(
      () =>
        new Promise<void>((resolve) => {
          try {
            const a = new Audio();
            pinDefaultOutput(a);
            a.preload = 'auto';
            a.src = url;
            const done = () => resolve();
            a.addEventListener('canplaythrough', done, { once: true });
            a.addEventListener('error', done, { once: true });
            window.setTimeout(done, 8_000);
          } catch {
            resolve();
          }
        }),
    );
}

function ensureEdgePreconnect(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('amoji-edge-preconnect')) return;
  const link = document.createElement('link');
  link.id = 'amoji-edge-preconnect';
  link.rel = 'preconnect';
  link.href = EDGE_SPEECH_ORIGIN;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  const dns = document.createElement('link');
  dns.id = 'amoji-edge-dns';
  dns.rel = 'dns-prefetch';
  dns.href = EDGE_SPEECH_ORIGIN;
  document.head.appendChild(dns);
}

/** Create/resume engines quietly — no HTMLAudio.play, no cheer/enter SFX. */
export function warmQuietAudioContext(): void {
  try {
    const ctx = createDefaultAudioContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  } catch {
    /* ignore */
  }
  try {
    resumeSfxContext();
  } catch {
    /* ignore */
  }
}

export function earlyAudioPreloadStarted(): boolean {
  return started;
}

/** Idempotent. Safe to call from /select mount and again on Start. */
export function runEarlyAudioPreload(opts?: {
  lang?: string;
  gender?: VoiceClipGender;
}): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (donePromise) return donePromise;
  started = true;
  const lang = opts?.lang ?? 'yue';
  const gender = opts?.gender ?? 'female';
  donePromise = (async () => {
    ensureEdgePreconnect();
    warmQuietAudioContext();
    void preloadVadRuntime().catch(() => false);
    const paths = criticalChatAudioPaths(lang, gender);
    await Promise.all(paths.map((p) => prefetchAudioPath(p)));
  })().catch(() => undefined);
  return donePromise;
}

/** Test helper — clears the once-latch between vitest cases. */
export function resetEarlyAudioPreloadForTests(): void {
  started = false;
  donePromise = null;
}
