'use client';
// r2026-10-04.89 — mid-tier insurance voice path.
// Why it exists: Simon's iPhone hears NOTHING from either previous path.
// (a) the Edge neural socket is frequently blocked on mobile networks, and
// (b) the iPhone hardware silent switch mutes speechSynthesis entirely.
// Google Translate's TTS endpoint serves real MP3 over plain HTTPS, and an
// <audio> media load is neither CORS-blocked nor silenced by the silent
// switch — so this tier guarantees audible speech almost everywhere.
// Emotion is approximated with playbackRate (excited = faster, sad = slower)
// since the endpoint has no prosody control; the lead tic is folded into the
// spoken text. Chunks play one <audio> at a time, chained.

import type { Lang } from './prefs';

/** Amoji lang → Google TTS locale */
const LANG_MAP: Record<Lang, string> = {
  yue: 'zh-HK',
  zh: 'zh-CN',
  ja: 'ja-JP',
  en: 'en-US',
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Split a line into endpoint-sized chunks (the service caps a request near
 * 200 chars; we stay well under). Same clause boundaries as the neural path
 * so pauses still land where a human would breathe.
 */
function splitChunks(text: string, maxLen = 120): string[] {
  const parts = text
    .split(/(?<=[。！？!?；;，,、—…\.])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur + p).length > maxLen) {
      chunks.push(cur);
      cur = p;
    } else {
      cur += p;
    }
    // a single clause longer than the cap gets hard-wrapped
    while (cur.length > maxLen) {
      chunks.push(cur.slice(0, maxLen));
      cur = cur.slice(maxLen);
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

let currentAudio: HTMLAudioElement | null = null;
/** bumped by stopGtts() — any in-flight chain sees a stale gen and cancels */
let generation = 0;

export function stopGtts(): void {
  generation++;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
}

export interface GttsOpts {
  lang: Lang;
  /** 1 = neutral; excitement pushes toward 1.3, sadness toward 0.75 */
  rate?: number;
  /** leading vocal tic, folded into the spoken text */
  lead?: string;
}

/**
 * Speak `text` through Google TTS as a chain of <audio> chunks. Resolves
 * when the whole line has played; rejects with Error('canceled') if
 * stopGtts() cuts it, or with a playback error the caller can fall back on.
 */
export function speakGtts(text: string, opts: GttsOpts): Promise<void> {
  stopGtts();
  const gen = generation;
  const lang = LANG_MAP[opts.lang] ?? 'en-US';
  const rate = clamp(opts.rate ?? 1, 0.75, 1.3);
  const full = opts.lead ? `${opts.lead}，${text}` : text;
  const chunks = splitChunks(full);
  return new Promise<void>((resolve, reject) => {
    let i = 0;
    const playNext = () => {
      if (gen !== generation) { reject(new Error('canceled')); return; }
      if (i >= chunks.length) { resolve(); return; }
      const q = encodeURIComponent(chunks[i]!);
      i++;
      const audio = new Audio(
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${q}`,
      );
      currentAudio = audio;
      try { audio.playbackRate = rate; } catch { /* iOS guard */ }
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        playNext();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        reject(new Error('gtts playback failed'));
      };
      audio.play().catch((e: unknown) => {
        if (currentAudio === audio) currentAudio = null;
        reject(e instanceof Error ? e : new Error(String(e)));
      });
    };
    playNext();
  });
}
