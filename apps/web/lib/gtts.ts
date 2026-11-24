'use client';
import {
  ensureCompanionPlaybackRoute,
  htmlAudioStartMode,
  startHtmlAudioOnDefaultSpeakers,
} from './audio-output';
import { applyPlaybackVolume } from './playback-volume';
// First hop on the free wire-now chain (gtts → synth → edge; tts-chain.ts).
// Unofficial Google Translate MP3 client over plain HTTPS. Edge read-aloud is
// dead-by-default in voice-capability, so this tier runs before synth. Paid Google
// Cloud TTS is a different product and is not called from here.
// r2026-10-04.89 — mid-tier insurance voice path.
// Why it exists: Simon's iPhone hears NOTHING from either previous path.
// (a) the Edge neural socket is frequently blocked on mobile networks, and
// (b) the iPhone hardware silent switch mutes speechSynthesis entirely.
// Google Translate's TTS endpoint serves real MP3 over plain HTTPS, and an
// <audio> media load is neither CORS-blocked nor silenced by the silent
// switch — so this tier guarantees audible speech almost everywhere.
// Emotion is approximated with playbackRate (excited = faster, sad = slower)
// since the endpoint has no prosody control; the lead tic is folded into the
// spoken text. Pitch is NEVER reshaped: the owner's directive (2026-11-23) is
// the ORIGINAL TTS audio, playbackRate 1 with normal pitch preservation. The
// old preservesPitch=false / gender-bias resample made speech sound slurred
// and made male cards play a pitched-down woman. Chunks play one <audio> at a
// time, chained.
// r2026-10-05.99: (a) splitChunks() drops the regex lookbehind — `(?<=…)` is
// a hard SyntaxError on WebKit before Safari 16.4 (iOS 16.4) and killed the
// whole voice chain there; manual char scanner now. (b) Each chunk gets a
// 10s stall watchdog — a wedged Safari media request used to hang the chain
// forever (no error, no end), so tier 3 never ran. (c) New `onPlaying`
// fires the moment the first chunk actually plays (media gate provably open).

import type { Lang } from './prefs';
import { stripVoicedGlyphs } from './speak-text';
import { followAudioElement } from './speech';
import { dispatchSpeechCaption, clearSpeechCaption } from './speech-caption';

/**
 * Amoji lang → default Google TTS locale. This is only the DEFAULT: the
 * endpoint's `tl` parameter is the one thing that selects a speaker, so the
 * picker passes its own code through `tl` and this map is the fallback.
 */
const LANG_MAP: Record<Lang, string> = {
  // Google Translate's TTS accepts `yue` and renders actual Cantonese. `zh-HK`
  // also returns audio but is the Mandarin Hong Kong voice, which mispronounces
  // the colloquial Cantonese lines this app speaks.
  yue: 'yue',
  zh: 'zh-CN',
  ja: 'ja-JP',
  en: 'en-US',
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Pitch processing was REMOVED (owner 2026-11-23). This tier now plays the
 * endpoint's MP3 unchanged: `playbackRate` stays at the emotion rate (1 for
 * normal speech) and `preservesPitch` is never touched, so the browser keeps
 * the speaker's natural timbre.
 *
 * History, so it is not reintroduced: the endpoint serves ONE female speaker
 * per `tl`. The app used to set preservesPitch=false and playbackRate 0.64
 * (male) … 1.72 (female bright) to fake other speakers. That resample shifted
 * formants and tempo together — the "sound badly" report — and a male card
 * was a pitched-down woman, the "male voice is female" report. Real timbre
 * needs a real male source; see voice-capability.ts.
 *
 * Web Audio formant filtering is not a substitute: the MP3 response carries
 * Cross-Origin-Resource-Policy and no ACAO, so MediaElementSource /
 * decodeAudioData silence it on Chrome and iOS Safari.
 */

/**
 * Split a line into one request per clause (the service caps near 200 chars;
 * we stay under 120). Each 。，！？ keeps its own chunk so pauseAfterClause can
 * insert a real breath between them — merging short clauses into one MP3 used
 * to erase those gaps and make her sound breathless.
 * r2026-10-05.99: NO regex lookbehind (SyntaxError on WebKit < iOS 16.4) —
 * manual scanner: cut right AFTER any clause-ending punctuation, trim each.
 * Trailing `\n` / `\n\n` markers record soft vs paragraph breaks for
 * pauseAfterClause (stripped before audio via stripVoicedGlyphs).
 */
const CLAUSE_PUNCT = /[。！？!?；;，,、:：—…\.]/;

/** One clause per pause mark — shared by gTTS, Edge SSML, and speechSynthesis. */
export function splitClauses(text: string): string[] {
  const parts: string[] = [];
  let cur = '';
  const flush = (breakNl: number) => {
    const s = cur.trim();
    cur = '';
    if (!s) {
      // Blank line after a punct-closed clause: upgrade to a paragraph pause.
      if (breakNl >= 2 && parts.length) {
        const prev = parts[parts.length - 1]!;
        if (!/\n\n$/.test(prev)) {
          parts[parts.length - 1] = prev.replace(/\n+$/, '') + '\n\n';
        }
      }
      return;
    }
    if (breakNl >= 2) parts.push(`${s}\n\n`);
    else if (breakNl === 1) parts.push(`${s}\n`);
    else parts.push(s);
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '\n') {
      let n = 1;
      while (i + 1 < text.length && text[i + 1] === '\n') {
        n++;
        i++;
      }
      flush(n);
      continue;
    }
    cur += ch;
    if (!CLAUSE_PUNCT.test(ch)) continue;
    // Attach trailing newlines to this clause so pauseAfterClause sees them.
    let j = i + 1;
    while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
    let n = 0;
    while (j < text.length && text[j] === '\n') {
      n++;
      j++;
    }
    if (n > 0) {
      flush(n);
      i = j - 1;
    } else {
      flush(0);
    }
  }
  flush(0);
  return parts;
}

export function splitChunks(text: string, maxLen = 120): string[] {
  const chunks: string[] = [];
  for (const p of splitClauses(text)) {
    let acc = p;
    // a single clause longer than the cap gets hard-wrapped
    while (acc.length > maxLen) {
      chunks.push(acc.slice(0, maxLen));
      acc = acc.slice(maxLen);
    }
    if (acc) chunks.push(acc);
  }
  return chunks;
}

let currentAudio: HTMLAudioElement | null = null;
/** bumped by stopGtts() — any in-flight chain sees a stale gen and cancels */
let generation = 0;
let gapTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Rejects the in-flight line. Without this, stopGtts() only paused the element:
 * the pending promise stayed unresolved until the 10s stall watchdog fired, so a
 * superseded line reported "chunk stalled" a full 10 seconds later instead of
 * cancelling immediately.
 */
let pendingReject: ((err: Error) => void) | null = null;
/** True while a tab hide owns the pause, so the show seam knows to resume. */
let pausedByHide = false;

/** Pause in-flight chunk when the tab is hidden (chain stays alive). */
export function pauseGttsForTabHide(): void {
  if (!currentAudio) return;
  pausedByHide = true;
  try { currentAudio.pause(); } catch { /* ignore */ }
}

/**
 * Resume the chunk a tab hide paused. Without this the paused <audio> kept the
 * serial speaker and the line only ended when the 10s stall watchdog fired -
 * the phone "she went silent" report after the screen locked or the user
 * checked another app mid-sentence. Playback already started before the pause,
 * so resuming needs no new user gesture.
 */
export function resumeGttsForTabShow(): void {
  if (!pausedByHide) return;
  pausedByHide = false;
  const audio = currentAudio;
  if (!audio) return;
  try {
    if (audio.paused) void audio.play().catch(() => undefined);
  } catch { /* ignore */ }
}

export function stopGtts(): void {
  generation++;
  pausedByHide = false;
  clearSpeechCaption();
  if (gapTimer) { clearTimeout(gapTimer); gapTimer = null; }
  const reject = pendingReject;
  pendingReject = null;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    try { currentAudio.playbackRate = 1; } catch { /* ignore */ }
    try { currentAudio.pause(); } catch { /* ignore */ }
    currentAudio = null;
  }
  // Cancel the awaiting caller right away so the chain falls through instead of
  // sitting in a 10-second stall.
  try { reject?.(new Error('canceled')); } catch { /* ignore */ }
}

/**
 * Card / select-board gesture taps: reject the old line and drop its generation
 * without pausing the prior HTMLAudio element in the same turn as the new
 * gesture `play()` — synchronous teardown left every card tap silent (#519).
 */
function beginGttsGestureLine(): number {
  generation++;
  pausedByHide = false;
  clearSpeechCaption();
  if (gapTimer) { clearTimeout(gapTimer); gapTimer = null; }
  const reject = pendingReject;
  pendingReject = null;
  try { reject?.(new Error('canceled')); } catch { /* ignore */ }
  const old = currentAudio;
  currentAudio = null;
  if (!old) return generation;
  old.onended = null;
  old.onerror = null;
  queueMicrotask(() => {
    try { old.playbackRate = 1; } catch { /* ignore */ }
    try { old.pause(); } catch { /* ignore */ }
  });
  return generation;
}

export interface GttsOpts {
  lang: Lang;
  /**
   * Google `tl` code to request, e.g. 'yue' | 'zh-TW' | 'en-GB'. This is the
   * only way to select a speaker on this endpoint — there is no voice id. An
   * unknown value falls back to the language default.
   */
  tl?: string;
  /** 1 = neutral; excitement pushes toward 1.3, sadness toward 0.75 */
  rate?: number;
  /** leading vocal tic, spoken as its own chunk ahead of the line */
  lead?: string;
  /** r99: fired the moment the first chunk actually starts playing (media gate open) */
  onPlaying?: () => void;
  /**
   * Fires as each chunk finishes, with the characters spoken so far. A fallback
   * tier uses this to speak only the remainder, so the line does not restart in
   * a different voice mid-sentence.
   */
  onProgress?: (spokenChars: number) => void;
  /**
   * DEPRECATED and ignored. Kept because lib/voice.ts passes its shared
   * resolver here on every path; that resolver now always returns 1
   * (lib/gtts-timbre.ts). The MP3 is never resampled — see the header.
   */
  pitchBias?: number;
  /**
   * Chat/async TTS: pin default sink before play so mic play-and-record does
   * not leave a silent communications route. Card greet / gesture paths omit
   * this and keep play-first (#424).
   */
  pinSinkBeforePlay?: boolean;
  /** Select-board tap: always play() in the gesture turn — never await pin first. */
  gestureTap?: boolean;
}

/**
 * Speak `text` through Google TTS as a chain of <audio> chunks. Resolves
 * when the whole line has played; rejects with Error('canceled') if
 * stopGtts() cuts it, or with a playback error the caller can fall back on.
 */
/**
 * ms of silence after a clause chunk before the next request starts.
 * Sentence ~250–500ms; paragraph (blank line) ~600–900ms; comma a short breath.
 */
export function pauseAfterClause(chunk: string): number {
  // Paragraph beat between spoken paragraphs (yue/zh/en/ja blank lines).
  if (/\n\n/.test(chunk)) return 750;
  // Soft single newline without a blank line.
  if (/\n/.test(chunk)) return 500;
  const t = chunk.replace(/[^\S\n]+$/g, '');
  // Audible breath: 180/90 was too short once chunks were separate — the next
  // MP3 started before the ear registered a stop at 。 or ，.
  if (/[。！？!?…\.]$/.test(t)) return 480;
  if (/[,，、；;:：—–]$/.test(t)) return 300;
  return 0;
}

/** Edge SSML `<break>` using the same timing table as pauseAfterClause. */
export function ssmlBreakAfterClause(chunk: string, isTail = false): string {
  if (isTail) return '';
  const ms = pauseAfterClause(chunk);
  if (ms <= 0) return '';
  return `<break time='${ms}ms'/>`;
}

export function speakGtts(text: string, opts: GttsOpts): Promise<void> {
  const gen = opts.gestureTap ? beginGttsGestureLine() : (stopGtts(), generation);
  // Mic may have left the session in play-and-record — force speakers first so
  // non-Yue / male pins match the gate sample device (not communications).
  ensureCompanionPlaybackRoute();
  const lang = opts.tl ?? LANG_MAP[opts.lang] ?? 'en-US';
  const rate = clamp(opts.rate ?? 1, 0.88, 1.15);
  // `opts.pitchBias` is intentionally NOT read: original TTS only. Emotion
  // still nudges tempo (pitch preserved by the browser), never timbre.
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
    /** Characters fully spoken, so a fallback can resume instead of restarting. */
    let spokenChars = 0;
    /** Clears the module-level cancel hook so a later stopGtts() is a no-op. */
    const clearPending = () => { pendingReject = null; };
    const failLine = (err: Error) => {
      clearPending();
      reject(err);
    };
    const doneLine = () => {
      clearPending();
      clearSpeechCaption();
      resolve();
    };
    pendingReject = failLine;
    const playNext = () => {
      if (gen !== generation) { failLine(new Error('canceled')); return; }
      if (i >= pieces.length) { doneLine(); return; }
      const piece = pieces[i]!;
      const q = encodeURIComponent(piece.text);
      i++;
      const audio = new Audio(
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${q}`,
      );
      try { audio.dataset.amojiAudio = '1'; } catch { /* non-DOM Audio stubs */ }
      // Do NOT pinDefaultOutput before the first play() OR inside onplay:
      // setSinkId races gesture play and also interrupts live HTMLAudio after
      // onplay (owner: Yue female ok, every other lang/gender mute). Pin only
      // on play() reject-retry. Route via ensureCompanionPlaybackRoute above.
      applyPlaybackVolume(audio);
      audio.preload = 'auto';
      currentAudio = audio;
      try { audio.playbackRate = rate; } catch { /* iOS guard */ }
      // Pitch is deliberately untouched: no preservesPitch=false, no resample.
      // The browser's default (pitch preserved) keeps the endpoint's speaker
      // natural, which is the owner's "original TTS" directive.
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
          failLine(new Error('gtts chunk stalled'));
        });
      }, 10_000);
      audio.onended = () => {
        settle(() => {
          if (currentAudio === audio) currentAudio = null;
          spokenChars += piece.text.length;
          try { opts.onProgress?.(spokenChars); } catch { /* ignore */ }
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
          failLine(new Error('gtts playback failed'));
        });
      };
      audio.onplay = () => {
        // Do NOT pinDefaultOutput here — setSinkId mid-stream kills gTTS after
        // onplay on Chrome/Windows (non-Yue / male went silent).
        const last = i >= pieces.length;
        try { dispatchSpeechCaption(piece.text); } catch { /* ignore */ }
        if (!reportedPlaying) {
          reportedPlaying = true;
          try { opts.onPlaying?.(); } catch { /* ignore */ }
        }
        // Later chunks keep the mouth open; only the last one may close it.
        followAudioElement(audio, last);
      };
      // Gesture/card: play-first + pin on reject only (#424).
      // Chat (pinSinkBeforePlay): pin default sink first — play() succeeds under
      // play-and-record while routing to a mute communications device.
      void startHtmlAudioOnDefaultSpeakers(
        audio,
        htmlAudioStartMode(opts.pinSinkBeforePlay, opts.gestureTap),
      ).catch((err: unknown) => {
        settle(() => {
          if (currentAudio === audio) currentAudio = null;
          failLine(err instanceof Error ? err : new Error(String(err)));
        });
      });
    };
    playNext();
  });
}
