'use client';
import { pinDefaultOutput } from './audio-output';
import { applyPlaybackVolume } from './playback-volume';
// Not on the free wire-now chain (Edge → speechSynthesis). Kept as an
// optional unofficial Translate MP3 client. Paid Google Cloud TTS is a
// different product and is not called from here.
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
// r2026-10-05.99: (a) splitChunks() drops the regex lookbehind — `(?<=…)` is
// a hard SyntaxError on WebKit before Safari 16.4 (iOS 16.4) and killed the
// whole voice chain there; manual char scanner now. (b) Each chunk gets a
// 10s stall watchdog — a wedged Safari media request used to hang the chain
// forever (no error, no end), so tier 3 never ran. (c) New `onPlaying`
// fires the moment the first chunk actually plays (media gate provably open).

import type { Lang } from './prefs';
import { stripVoicedGlyphs } from './speak-text';
import { followAudioElement } from './speech';

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
 * r2026-10-05.99: NO regex lookbehind (SyntaxError on WebKit < iOS 16.4) —
 * manual scanner: cut right AFTER any clause-ending punctuation, trim each.
 */
const CLAUSE_END = /[。！？!?；;，,、—…\.]/;
function splitChunks(text: string, maxLen = 120): string[] {
  const parts: string[] = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (CLAUSE_END.test(ch)) {
      const s = cur.trim();
      if (s) parts.push(s);
      cur = '';
    }
  }
  const tail = cur.trim();
  if (tail) parts.push(tail);
  const chunks: string[] = [];
  let acc = '';
  for (const p of parts) {
    if (acc && (acc + p).length > maxLen) {
      chunks.push(acc);
      acc = p;
    } else {
      acc += p;
    }
    // a single clause longer than the cap gets hard-wrapped
    while (acc.length > maxLen) {
      chunks.push(acc.slice(0, maxLen));
      acc = acc.slice(maxLen);
    }
  }
  if (acc) chunks.push(acc);
  return chunks;
}

let currentAudio: HTMLAudioElement | null = null;
/** bumped by stopGtts() — any in-flight chain sees a stale gen and cancels */
let generation = 0;
let gapTimer: ReturnType<typeof setTimeout> | null = null;

export function stopGtts(): void {
  generation++;
  if (gapTimer) { clearTimeout(gapTimer); gapTimer = null; }
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    try { currentAudio.playbackRate = 1; } catch { /* ignore */ }
    currentAudio.pause();
    currentAudio = null;
  }
}

export interface GttsOpts {
  lang: Lang;
  /** 1 = neutral; excitement pushes toward 1.3, sadness toward 0.75 */
  rate?: number;
  /** leading vocal tic, spoken as its own chunk ahead of the line */
  lead?: string;
  /** r99: fired the moment the first chunk actually starts playing (media gate open) */
  onPlaying?: () => void;
}

/**
 * Speak `text` through Google TTS as a chain of <audio> chunks. Resolves
 * when the whole line has played; rejects with Error('canceled') if
 * stopGtts() cuts it, or with a playback error the caller can fall back on.
 */
function pauseAfterClause(chunk: string): number {
  if (/[。！？!?…\.]$/.test(chunk)) return 180;
  if (/[,，、；;:：—–]$/.test(chunk)) return 90;
  return 0;
}

export function speakGtts(text: string, opts: GttsOpts): Promise<void> {
  stopGtts();
  const gen = generation;
  const lang = LANG_MAP[opts.lang] ?? 'en-US';
  const rate = clamp(opts.rate ?? 1, 0.88, 1.15);
  // Lead (poke laugh / ouch) is its own chunk. It is not glued on with a
  // comma, and every chunk sets playbackRate itself so the laugh cannot
  // leave the following line fast or pitched.
  const pieces: { text: string; pauseAfter: number }[] = [];
  if (opts.lead) {
    const lead = stripVoicedGlyphs(opts.lead);
    if (lead) pieces.push({ text: lead, pauseAfter: 140 });
  }
  for (const chunk of splitChunks(text)) {
    const spoken = stripVoicedGlyphs(chunk);
    if (!spoken) continue;
    pieces.push({ text: spoken, pauseAfter: pauseAfterClause(chunk) });
  }
  return new Promise<void>((resolve, reject) => {
    if (pieces.length === 0) { resolve(); return; }
    let i = 0;
    let reportedPlaying = false;
    const playNext = () => {
      if (gen !== generation) { reject(new Error('canceled')); return; }
      if (i >= pieces.length) { resolve(); return; }
      const piece = pieces[i]!;
      const q = encodeURIComponent(piece.text);
      i++;
      const audio = new Audio(
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${q}`,
      );
      pinDefaultOutput(audio);
      applyPlaybackVolume(audio);
      audio.preload = 'auto';
      currentAudio = audio;
      try { audio.playbackRate = rate; } catch { /* iOS guard */ }
      // r99: a stalled Safari media request used to wedge this chain forever
      // (no error event, no ended) — tier 3 never ran. 10s per-chunk
      // watchdog bails the whole line out so the fallthrough can speak.
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(stall);
        fn();
      };
      const stall = setTimeout(() => {
        settle(() => {
          if (currentAudio === audio) currentAudio = null;
          try { audio.pause(); } catch { /* ignore */ }
          reject(new Error('gtts chunk stalled'));
        });
      }, 10_000);
      audio.onended = () => {
        settle(() => {
          if (currentAudio === audio) currentAudio = null;
          const more = i < pieces.length;
          if (more && piece.pauseAfter > 0 && gen === generation) {
            gapTimer = setTimeout(() => { gapTimer = null; playNext(); }, piece.pauseAfter);
          } else {
            playNext();
          }
        });
      };
      audio.onerror = () => {
        settle(() => {
          if (currentAudio === audio) currentAudio = null;
          reject(new Error('gtts playback failed'));
        });
      };
      audio.onplay = () => {
        const last = i >= pieces.length;
        if (!reportedPlaying) {
          reportedPlaying = true;
          try { opts.onPlaying?.(); } catch { /* ignore */ }
        }
        // Later chunks keep the mouth open; only the last one may close it.
        followAudioElement(audio, last);
      };
      audio.play().catch((e: unknown) => {
        settle(() => {
          if (currentAudio === audio) currentAudio = null;
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      });
    };
    playNext();
  });
}
