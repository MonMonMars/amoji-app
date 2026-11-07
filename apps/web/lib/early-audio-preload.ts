'use client';
// Silent early warm of the chat audio stack from /select before /chat.
// Prefetches critical CLIP um / laugh / poke bytes + Silero VAD CDN scripts,
// creates a (possibly suspended) AudioContext, and DNS-preconnects Edge TTS.
// Does NOT play enter/cheer SFX — OPEN_CHEER_MS / THINKING_SOUND_DELAY_MS stay
// authoritative on chat mount (#90). Never prompts for mic permission.

import { assetUrl } from './asset';
import { createDefaultAudioContext } from './audio-output';
import { resumeSfxContext } from './sfx';
import { preloadVadRuntime } from './vad';
import { clipLang, type VoiceClipGender } from './voice-clips';

/** Edge readaloud origin (wss host). Preconnect only — no audible open. */
export const EDGE_SPEECH_ORIGIN = 'https://speech.platform.bing.com';

let started = false;
let donePromise: Promise<void> | null = null;

/**
 * Critical first-talk paths. Fixed names (no rotating filler/laugh cursors)
 * so a background warm cannot burn the next spoken pick. Only files that
 * ship under public/voice-clips (404s are tolerated but avoided).
 */
export function criticalChatAudioPaths(
  lang = 'yue',
  gender: VoiceClipGender = 'female',
): string[] {
  const folder = clipLang(lang);
  const other: VoiceClipGender = gender === 'female' ? 'male' : 'female';
  const paths = [
    `/voice-clips/${folder}/${gender}/um_long.mp3`,
    `/voice-clips/${folder}/${other}/um_long.mp3`,
    `/voice-clips/universal/${gender}/laugh.mp3`,
  ];
  if (gender === 'female') {
    paths.push(
      '/voice-clips/universal/female/um.mp3',
      '/voice-clips/universal/female/wow_woven.mp3',
      '/voice-clips/universal/female/hehe.mp3',
    );
  } else {
    paths.push(
      '/voice-clips/ja/male/oh.mp3',
      '/voice-clips/universal/male/wow.mp3',
      '/voice-clips/ja/male/um.mp3',
    );
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
