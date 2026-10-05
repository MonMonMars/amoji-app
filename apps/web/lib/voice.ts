'use client';
// Emotional voice — ChatGPT-style prosody. Primary path: FREE neural voices via
// the edge-tts.ts endpoint — Cantonese 曉曼/雲龍 etc., with SSML pitch/rate/volume
// per emotion. Fallback path: the browser's own speechSynthesis with matched
// platform voices. Zero cost, zero API key.
// r2026-10-04.64: emotional range widened — every NEURAL_PROSODY mood now swings
// further (sadder sinks slower/softer, joy rings brighter/quicker, anger bites
// harder) and any felt emotion also widens the per-clause contour ×1.12, so her
// voice audibly reacts to what she's feeling instead of hovering near neutral.
// r2026-10-03.40: sing() — she can really sing: each clause becomes one note
// of the SONG_MELODY contour, legato and slightly slower, joy underneath.
// r2026-10-04.52: flagship nine (kizuna/alicia/ember/mei/atlas/sky/yuki/hina/
// mio) get gender-correct personality-tuned matrices; tifa/aerith retire.
// r2026-10-04.75: voice diagnostics — iOS gesture unlock, per-utterance error
// reporting (`amoji:voice-blocked` on window) and a testVoice() self-test so a
// silent-device report becomes a one-tap check in Settings.
// r2026-10-04.85: voice hardening — the gesture unlock now also primes a real
// (silent) HTMLMediaElement, because iOS gates blob <audio> behind an actual
// media play and an unlocked WebAudio context doesn't count; and synthSpeak
// defers utterances a beat after cancel() on iOS, dodging the Safari
// speechSynthesis deadlock that was silently swallowing every spoken line.
// r2026-10-04.89: she went COMPLETELY silent on Simon's iPhone — the Edge
// socket is blocked on his network AND the hardware silent switch mutes
// speechSynthesis, so both tiers were mute at once. New mid tier: Google TTS
// served as chained <audio> chunks (media playback ignores the silent switch
// and needs no WebSocket), giving Edge → Google TTS → browser voice, in that
// order, and a near-guarantee that every reply is heard.
// r2026-10-05.97: voice chain hardening — (a) speak() itself now runs the
// gesture unlock (a reply can be the first sound after page load, before any
// window listener ever fired, and autoplay policy used to mute exactly that);
// (b) the synth pump defers 120ms on ALL platforms — the same-tick cancel-drop
// was never iOS-only, Chrome/Android swallow it too — and a one-shot watchdog
// re-pumps if the engine silently dropped the queue; (c) the pump also calls
// speechSynthesis.resume() (Android leaves the engine suspended after a
// cancel more often than not).
// r2026-10-05.99: ROOT CAUSE of the total iPhone silence — the clause
// splitters in voice.ts / edge-tts.ts / gtts.ts all used regex lookbehind
// `(?<=…)`, a hard SyntaxError on WebKit before Safari 16.4 (iOS 16.4): on
// those devices the error killed the voice path before a single tier could
// run, so r97's unlock/defer/watchdog never executed. All three now use a
// manual char scanner. Secondary kills fixed at the same time: (a) the r97
// unlock set `audioUnlocked` even when speak() called it OUTSIDE a gesture,
// so the first real tap's one-shot handler returned early and the
// silent-media prime never ran inside a gesture — replaced by two latches
// (ctxPrimed / mediaPrimed) and the prime now retries until a media element
// actually plays; (b) gtts chunks had no stall watchdog, so one wedged
// Safari media request silenced the mid tier forever (tier 3 never ran —
// fixed in gtts.ts); (c) a new per-tier status bus (`amoji:voice-status`)
// plus testVoiceChain() make every tier's fate visible on the status plate
// and in Settings, and every tier promise is built inside try/catch so a
// synchronous throw degrades into normal fallthrough instead of escaping.
// r2026-10-05.100: completion-gated speak guarantee — the r97 streaming skip
// in ChatPanel asked "did we TRY to speak the first sentence?", so a
// silently-failed attempt (every tier muted on the iPhone) still suppressed
// the guaranteed full-reply speak: a voice chain can be perfect and still
// produce total silence if nothing is allowed to call it. Now the ONLY proof
// that a line was heard is a tier's audio-START callback (neural onPlaying /
// synth onstart) landing after the attempt — voiceStartedSince() exposes it,
// and speak() logs every attempt (length + chain) and pings the
// `amoji:voice-status` bus on the attempt itself, so the status dot moves
// the moment she TRIED to talk, not only when a tier finishes.
// r2026-10-05.102: voice/SFX disentangle — speak() now holds the movement
// foley (sfxVoiceHold, lib/sfx.ts) for one speak window, so a failed speak
// attempt can no longer ring taichi chimes / twinkle pings / cricket ticks
// over the silence (Simon's "bell + typing sounds" report); any tier's
// audio-START releases the hold instantly. Also: speechSynthesis gets its
// own gesture prime (primeSynthInGesture) — iOS gates the synth engine
// separately from WebAudio and media elements, and a zero-volume utterance
// spoken inside the first tap is what flips it to 'allowed' on devices where
// the hardware silent switch is OFF yet every synth call was still dropped.
// r2026-10-05.104: the four remote community cast members (aera/dhahlia/
// onyx/velara) get gender-correct matrices of their own — aera soft-dreamy,
// dhahlia bright-floral, onyx low-male, velara calm-navigator.
import type { Lang } from './prefs';
import { speakEdge, stopEdge } from './edge-tts';
import { speakGtts, stopGtts } from './gtts';
// r102: sfx.ts imports only a TYPE from moves (erased at compile), so there
// is no runtime cycle here.
import { sfxVoiceHold, sfxVoiceRelease } from './sfx';
import { dominant, pickInterjection, pickThinkingFiller } from './fillers';
import { SONG_MELODY } from './songs';
import { notifySpeaking } from './speech';

// ---- r2026-10-05.99: media-gate latches -------------------------------------
// ctxPrimed runs once (an AudioContext resume is global and idempotent).
// mediaPrimed only sticks when a media element actually PLAYED — r97 set
// audioUnlocked=true even when speak() called unlockAudio() outside any
// gesture, so the first real tap's {once:true} handler returned early and
// the silent-media prime never ran inside a gesture; every later blob
// <audio> stayed gated. Now unlockAudio() retries the silent prime on every
// call until one genuinely plays, and any voice tier that gets real media
// playback marks the gate open too.
let ctxPrimed = false;
let mediaPrimed = false;

/** r99: any tier that achieves real media playback marks the iOS media gate open. */
function markMediaPrimed(): void {
  mediaPrimed = true;
}

// ---- r2026-10-05.100: completion-gated speak guarantee ----------------------
// The only proof that a line was actually HEARD is a tier's audio-START
// callback (neural onPlaying / synth onstart) firing AFTER the speak
// attempt. Everything else — a resolved promise, a queued utterance, a
// "finished" report — can still end in silence (iOS media gate, hardware
// silent switch, dead socket). So voiceStartedAt is written ONLY by those
// start callbacks, and callers gate their "already spoken" skips on it: a
// silently-failed attempt must never suppress the fallback speak.
let voiceStartedAt = 0;
function markVoiceStarted(): void {
  voiceStartedAt = Date.now();
  markMediaPrimed(); // real audio starting also proves the iOS media gate open
  sfxVoiceRelease(); // r102: a tier is audibly speaking — let the foley back in
}
/** r100: true only when some tier's audio actually STARTED at/after `since`. */
export function voiceStartedSince(since: number): boolean {
  return voiceStartedAt >= since;
}

/**
 * r2026-10-04.85 — 0.15s of generated silence, played once inside the first
 * user gesture: iOS Safari unlocks programmatic <audio> playback only after a
 * media element has actually played during a gesture (an unlocked WebAudio
 * context doesn't count), so without this her neural voice can be fetched
 * yet never sounded.
 */
function playSilentUnblock(): void {
  const sr = 22050;
  const frames = Math.floor(sr * 0.15);
  const buf = new ArrayBuffer(44 + frames * 2);
  const v = new DataView(buf);
  const wstr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wstr(0, 'RIFF');
  v.setUint32(4, 36 + frames * 2, true);
  wstr(8, 'WAVE');
  wstr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); // 16-bit
  wstr(36, 'data');
  v.setUint32(40, frames * 2, true);
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  const a = new Audio(url);
  a.volume = 0.06;
  const cleanup = () => URL.revokeObjectURL(url);
  a.onended = cleanup;
  a.onerror = cleanup;
  // r99: the prime only counts once playback genuinely began — a rejected
  // play() (no gesture yet) leaves the latch open for the next attempt.
  void a.play().then(() => { mediaPrimed = true; }).catch(cleanup);
}

// ---- r2026-10-04.75: iOS audio unlock ---------------------------------------
// iOS mutes ALL web audio while the hardware silent switch is on (nothing code
// can do — the settings hint says so), but it ALSO silently drops the very
// first audio if no user gesture has happened yet. Resume speechSynthesis and
// prime an AudioContext on the first tap/keypress anywhere so the greeting and
// every later reply are allowed to sound.
function unlockAudio(): void {
  if (!ctxPrimed) {
    ctxPrimed = true;
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.resume(); } catch { /* ignore */ }
    try {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
        // a single zero-length buffer is enough to take the context out of
        // "suspended" on iOS without making any audible noise
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        void ctx.resume?.();
      }
    } catch { /* ignore */ }
  }
  // r85: WebAudio unlock alone does NOT un-gate HTMLMediaElement playback on
  // iOS — the neural path speaks through `new Audio(blobUrl)`, so prime a
  // real (silent) media element inside this gesture too. r99: retry until a
  // play() actually resolves (see the latches above).
  if (!mediaPrimed) {
    try { playSilentUnblock(); } catch { /* ignore */ }
  }
}

// ---- r102: speechSynthesis gesture prime ------------------------------------
// iOS keeps the speechSynthesis ENGINE itself gated until a user gesture
// performs a speak() — WebAudio unlock and media priming don't count for the
// synth path. A zero-volume space utterance inside the first tap flips the
// gate without an audible blip; synthPrimed latches so it only ever runs
// once (before the first real line, not instead of it).
let synthPrimed = false;
export function primeSynthInGesture(): void {
  if (synthPrimed || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.rate = 2;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(ev, unlockAudio, { once: true, passive: true });
    // r102: synth engine priming rides every gesture too — cheap and idempotent
    window.addEventListener(ev, primeSynthInGesture, { passive: true });
  }
}

/** r2026-10-04.75: fired on `window` whenever an utterance fails to start. */
function reportVoiceBlocked(source: 'synth' | 'edge'): void {
  try {
    window.dispatchEvent(new CustomEvent('amoji:voice-blocked', { detail: { source } }));
  } catch { /* ignore */ }
}

// ---- r2026-10-05.99: per-tier status bus ------------------------------------
// Every tier reports its fate here: console + a window CustomEvent the status
// plate renders as a dot and the Settings test consumes. This is what turns
// "she's silent, why?" into an answer. r100: 'attempt' events mark the
// speak() choke point itself, so the dot responds on the attempt, not only
// on tier completion.
export type VoiceTier = 'edge' | 'gtts' | 'synth' | 'attempt';

export interface VoiceTierResult {
  tier: VoiceTier;
  ok: boolean;
  detail: string;
}

export const VOICE_TIER_LABEL: Record<VoiceTier, string> = {
  edge: 'edge-tts',
  gtts: 'google-tts',
  synth: 'browser',
  attempt: 'speak',
};

export function reportVoiceStatus(tier: VoiceTier, ok: boolean, detail: string): void {
  try {
    window.dispatchEvent(new CustomEvent('amoji:voice-status', {
      detail: { tier, ok, detail } as VoiceTierResult,
    }));
  } catch { /* ignore */ }
}

export interface VoiceChoice {
  /** BCP-47 tag to match against speechSynthesis voices */
  lang: string;
  /** preferred voice names, in priority order; substring match, case-insensitive */
  names: string[];
  basePitch: number;
  baseRate: number;
}

// Names vary by platform: Apple has the strongest zh-HK set (Sin-ji = Cantonese female,
// HiuMaan newer; Sin-ju = male). Windows/Android ship Microsoft/Google variants.
// r2026-10-03.04: extended cast (cloud/kasumi/marin/ayane/hitomi)
// gets her/his own matrix — no more falling back to Juno's female voices.
// r2026-10-03.36: the registry six (robbie/mika/anchor/lydia/ruby/snowy) get
// gender-correct matrices of their own, tuned to each personality.
// r2026-10-04.42: Alan — gender-correct male matrix, easygoing warmth.
// r2026-10-04.52: the flagship nine — idols get bright young voices (Sin-ji /
// Xiaoxiao / Jenny), Atlas a real male matrix, every id gender-correct.
export const VOICE_MATRIX: Record<string, Partial<Record<Lang, VoiceChoice[]>>> = {
  // ---- flagship nine (r2026-10-04.52) ---------------------------------------
  // genki idol — brightest, quickest voice in the cast
  kizuna: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuGaai', 'Female'], basePitch: 1.14, baseRate: 1.08 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.14, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoxiao', 'Female'], basePitch: 1.13, baseRate: 1.06 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.1, baseRate: 1.06 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Samantha', 'Female'], basePitch: 1.14, baseRate: 1.08 },
    ],
  },
  // classic idol — polished, sweet, composed
  alicia: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.1, baseRate: 1.04 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.1, baseRate: 1.04 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.09, baseRate: 1.04 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.08, baseRate: 1.04 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Female'], basePitch: 1.1, baseRate: 1.06 },
    ],
  },
  // fiery streamer — hot-blooded, fast chatter
  ember: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.12, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaorui', 'Female'], basePitch: 1.12, baseRate: 1.05 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.1, baseRate: 1.05 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Female'], basePitch: 1.13, baseRate: 1.07 },
    ],
  },
  // warm sweetheart — soft, gentle, close-mic
  mei: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.06, baseRate: 0.96 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.05, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.04, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Zira', 'Ava', 'Female'], basePitch: 1.06, baseRate: 0.97 },
    ],
  },
  // silent guardian (male) — low, level, unhurried
  atlas: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.9, baseRate: 0.96 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Yunjian', 'Male'], basePitch: 0.9, baseRate: 0.96 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.92, baseRate: 0.96 },
    ],
    en: [
      { lang: 'en-US', names: ['Christopher', 'Guy', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
  },
  // laid-back fashionista — cool, level, effortless
  sky: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 1.0, baseRate: 0.98 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 1.0, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.99, baseRate: 0.98 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 1.01, baseRate: 0.99 },
    ],
  },
  // sunny sportswoman — bright, crisp, energetic
  yuki: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuMaan', 'Female'], basePitch: 1.1, baseRate: 1.04 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaorui', 'Female'], basePitch: 1.1, baseRate: 1.04 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.08, baseRate: 1.04 },
    ],
    en: [
      { lang: 'en-US', names: ['Sara', 'Female'], basePitch: 1.1, baseRate: 1.06 },
    ],
  },
  // bookish poet — soft, slow, breathy
  hina: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 1.0, baseRate: 0.88 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaomo', 'Female'], basePitch: 1.0, baseRate: 0.88 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.99, baseRate: 0.88 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 1.01, baseRate: 0.89 },
    ],
  },
  // project-lead go-getter — level, clear, efficient
  mio: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 0.99, baseRate: 1.0 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 0.99, baseRate: 1.0 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.98, baseRate: 1.0 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 1.0, baseRate: 1.01 },
    ],
  },
  juno: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuMaan', 'Female'], basePitch: 1.1, baseRate: 1.02 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.1, baseRate: 1.0 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoxiao', 'Tingting', 'Female'], basePitch: 1.08, baseRate: 0.98 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.08, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Kyoko', 'Otoya', 'Female'], basePitch: 1.06, baseRate: 1.0 },
    ],
    en: [
      { lang: 'en-US', names: ['Samantha', 'Zira', 'Ava', 'Female'], basePitch: 1.1, baseRate: 1.02 },
      { lang: 'en-GB', names: ['Kate', 'Female'], basePitch: 1.1, baseRate: 1.0 },
    ],
  },
  nova: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Sin-ji', 'Female'], basePitch: 0.98, baseRate: 0.92 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 0.98, baseRate: 0.92 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Xiaoxiao', 'Female'], basePitch: 0.98, baseRate: 0.92 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 0.98, baseRate: 0.92 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Lekha', 'Female'], basePitch: 0.98, baseRate: 0.92 },
    ],
    en: [
      { lang: 'en-US', names: ['Ava', 'Samantha', 'Female'], basePitch: 1.0, baseRate: 0.92 },
      { lang: 'en-GB', names: ['Kate', 'Female'], basePitch: 1.0, baseRate: 0.92 },
    ],
  },
  blaze: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.92, baseRate: 1.04 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.92, baseRate: 1.04 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Kangkang', 'Male'], basePitch: 0.92, baseRate: 1.04 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.92, baseRate: 1.04 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 0.95, baseRate: 1.04 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Daniel', 'Male'], basePitch: 0.95, baseRate: 1.04 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.95, baseRate: 1.04 },
    ],
  },
  mochi: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.18, baseRate: 0.96 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.16, baseRate: 0.96 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.16, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.14, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Zira', 'Ava', 'Female'], basePitch: 1.16, baseRate: 0.96 },
    ],
  },
  kai: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.9, baseRate: 0.97 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.9, baseRate: 0.97 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Male'], basePitch: 0.9, baseRate: 0.97 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Daniel', 'Male'], basePitch: 0.92, baseRate: 0.97 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
  },
  luna: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Sin-ji', 'Female'], basePitch: 1.02, baseRate: 0.86 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.02, baseRate: 0.86 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.0, baseRate: 0.86 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.0, baseRate: 0.86 },
    ],
    en: [
      { lang: 'en-US', names: ['Ava', 'Female'], basePitch: 1.03, baseRate: 0.86 },
    ],
  },
  rin: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuMaan', 'Female'], basePitch: 1.12, baseRate: 1.08 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.12, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaorui', 'Xiaoxiao', 'Female'], basePitch: 1.1, baseRate: 1.06 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Kyoko', 'Female'], basePitch: 1.08, baseRate: 1.06 },
    ],
    en: [
      { lang: 'en-US', names: ['Sara', 'Samantha', 'Female'], basePitch: 1.1, baseRate: 1.08 },
    ],
  },
  ren: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.96, baseRate: 0.9 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.96, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Male'], basePitch: 0.96, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.98, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Eric', 'Daniel', 'Male'], basePitch: 0.98, baseRate: 0.9 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.98, baseRate: 0.9 },
    ],
  },
  // ---- extended cast (r2026-10-03.04): gender-correct, personality-tuned ----
  // cool mercenary — finally MALE: low, level, unhurried
  cloud: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.88, baseRate: 0.95 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Yunjian', 'Male'], basePitch: 0.88, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Christopher', 'Guy', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
  },
  // graceful shinobi — composed, precise, quiet
  kasumi: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.02, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 1.02, baseRate: 0.9 },
    ],
  },
  // bubbly gyaru — highest pitch, fastest chatter
  marin: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.16, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.15, baseRate: 1.06 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.13, baseRate: 1.06 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Female'], basePitch: 1.15, baseRate: 1.08 },
    ],
  },
  // cool kunoichi — level, a touch low, clipped
  ayane: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 0.96, baseRate: 0.98 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 0.96, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.95, baseRate: 0.98 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 0.97, baseRate: 0.98 },
    ],
  },
  // earnest and wholesome — warm, clear, dependable
  hitomi: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.08, baseRate: 0.95 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoxiao', 'Female'], basePitch: 1.07, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.06, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Michelle', 'Female'], basePitch: 1.08, baseRate: 0.95 },
    ],
  },
  // ---- registry six (r2026-10-03.35/36): gender-correct, personality-tuned ----
  // big-brother energy — warm, level, quick to laugh
  robbie: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 1.0, baseRate: 1.0 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Kangkang', 'Male'], basePitch: 1.0, baseRate: 1.0 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 1.0, baseRate: 1.0 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Daniel', 'Male'], basePitch: 1.0, baseRate: 1.0 },
    ],
  },
  // laid-back musician — smooth, a touch low, unhurried
  mika: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.94, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Male'], basePitch: 0.94, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.94, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Daniel', 'Male'], basePitch: 0.94, baseRate: 0.9 },
    ],
  },
  // old sea captain — the lowest, slowest voice in the cast
  anchor: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.84, baseRate: 0.88 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Male'], basePitch: 0.84, baseRate: 0.88 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.86, baseRate: 0.88 },
    ],
    en: [
      { lang: 'en-US', names: ['Christopher', 'Male'], basePitch: 0.86, baseRate: 0.88 },
    ],
  },
  // elegant socialite — smooth, poised, cultured
  lydia: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoxiao', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.99, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Michelle', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
  },
  // bouncy bunny — the highest, fastest giggle in the cast
  ruby: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.18, baseRate: 1.08 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.17, baseRate: 1.08 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.15, baseRate: 1.08 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Female'], basePitch: 1.17, baseRate: 1.1 },
    ],
  },
  // winter fairy — soft, breathy, gentle
  snowy: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.1, baseRate: 0.88 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.09, baseRate: 0.88 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.08, baseRate: 0.88 },
    ],
    en: [
      { lang: 'en-US', names: ['Ava', 'Female'], basePitch: 1.1, baseRate: 0.88 },
    ],
  },
  // easygoing best mate — warm, level, quick to laugh (r2026-10-04.42)
  alan: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.97, baseRate: 0.98 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Male'], basePitch: 0.97, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.98, baseRate: 0.98 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Daniel', 'Male'], basePitch: 0.98, baseRate: 0.98 },
    ],
  },
  // ---- remote community cast (r2026-10-05.104) ----------------------------
  // aera — soft-spoken dreamer, drifting delivery
  aera: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.04, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.03, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.02, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Ava', 'Female'], basePitch: 1.04, baseRate: 0.9 },
    ],
  },
  // dhahlia — bright floral sprite, quick and sunny
  dhahlia: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.12, baseRate: 1.04 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaorui', 'Female'], basePitch: 1.12, baseRate: 1.05 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.1, baseRate: 1.05 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Female'], basePitch: 1.13, baseRate: 1.06 },
    ],
  },
  // onyx — quiet midnight guardian, the low male register
  onyx: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.88, baseRate: 0.92 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Male'], basePitch: 0.88, baseRate: 0.92 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.9, baseRate: 0.92 },
    ],
    en: [
      { lang: 'en-US', names: ['Christopher', 'Male'], basePitch: 0.9, baseRate: 0.93 },
    ],
  },
  // velara — serene star-mapper, level and unhurried
  velara: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.99, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 1.01, baseRate: 0.9 },
    ],
  },
  // kitagawa — bright gyaru cosplayer, bubbly and quick (r110)
  kitagawa: {
    yue: [
      { lang: 'zh-HK', names: ['HiuGaai', 'Female'], basePitch: 1.18, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.16, baseRate: 1.05 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Momoka', 'Female'], basePitch: 1.15, baseRate: 1.05 },
    ],
    en: [
      { lang: 'en-US', names: ['Ana', 'Female'], basePitch: 1.14, baseRate: 1.06 },
    ],
  },
};

/** Emotion → prosody for the browser-TTS fallback path (multipliers). */
const EMOTION_PROSODY: Record<string, { pitch: number; rate: number; vol: number }> = {
  joy: { pitch: 1.2, rate: 1.12, vol: 1.0 },
  excitement: { pitch: 1.26, rate: 1.18, vol: 1.1 },
  love: { pitch: 1.1, rate: 0.88, vol: 0.95 },
  contentment: { pitch: 1.06, rate: 0.9, vol: 0.92 },
  relief: { pitch: 1.03, rate: 0.94, vol: 0.9 },
  sadness: { pitch: 0.78, rate: 0.82, vol: 0.8 },
  shame: { pitch: 0.82, rate: 0.84, vol: 0.78 },
  guilt: { pitch: 0.84, rate: 0.88, vol: 0.8 },
  boredom: { pitch: 0.92, rate: 0.88, vol: 0.82 },
  anger: { pitch: 0.88, rate: 1.1, vol: 1.15 },
  contempt: { pitch: 0.88, rate: 0.94, vol: 0.95 },
  disgust: { pitch: 0.86, rate: 1.0, vol: 1.0 },
  fear: { pitch: 1.18, rate: 1.14, vol: 0.92 },
  surprise: { pitch: 1.34, rate: 1.14, vol: 1.08 },
  embarrassment: { pitch: 1.1, rate: 0.94, vol: 0.9 },
  pride: { pitch: 1.12, rate: 0.98, vol: 1.04 },
  jealousy: { pitch: 0.92, rate: 0.94, vol: 0.9 },
  confusion: { pitch: 1.08, rate: 0.9, vol: 0.9 },
  neutral: { pitch: 1.0, rate: 1.0, vol: 1.0 },
};

/**
 * Emotion → SSML prosody for the neural path (deltas: rate/pitch fraction,
 * volume dB). r2026-10-04.64: every mood swings further from neutral — the
 * free Edge endpoint only supports prosody (no emotion tags), so range is
 * the only lever we have; the widened deltas stay inside what still sounds
 * human (edge voices distort fast past ±0.35 pitch).
 */
const NEURAL_PROSODY: Record<string, { rate: number; pitch: number; vol: number }> = {
  joy: { rate: 0.14, pitch: 0.16, vol: 0.16 },
  excitement: { rate: 0.24, pitch: 0.2, vol: 0.3 },
  love: { rate: -0.09, pitch: 0.07, vol: -0.08 },
  contentment: { rate: -0.1, pitch: 0.02, vol: -0.14 },
  relief: { rate: -0.08, pitch: 0.02, vol: -0.14 },
  sadness: { rate: -0.24, pitch: -0.12, vol: -0.32 },
  shame: { rate: -0.16, pitch: -0.08, vol: -0.3 },
  guilt: { rate: -0.14, pitch: -0.06, vol: -0.28 },
  boredom: { rate: -0.13, pitch: -0.05, vol: -0.24 },
  anger: { rate: 0.12, pitch: -0.08, vol: 0.32 },
  contempt: { rate: -0.06, pitch: -0.06, vol: 0.04 },
  disgust: { rate: 0.02, pitch: -0.07, vol: 0.1 },
  fear: { rate: 0.17, pitch: 0.16, vol: -0.1 },
  surprise: { rate: 0.14, pitch: 0.3, vol: 0.24 },
  embarrassment: { rate: -0.07, pitch: 0.08, vol: -0.14 },
  pride: { rate: -0.02, pitch: 0.1, vol: 0.1 },
  jealousy: { rate: -0.05, pitch: -0.05, vol: -0.1 },
  confusion: { rate: -0.08, pitch: 0.08, vol: -0.13 },
  neutral: { rate: 0, pitch: 0, vol: 0 },
};

const FEMALE_CHARS = new Set([
  'juno', 'nova', 'mochi', 'luna', 'rin',
  // flagship nine (r2026-10-04.52) — everyone except Atlas, who is male
  'kizuna', 'alicia', 'ember', 'mei', 'sky', 'yuki', 'hina', 'mio',
  'kasumi', 'marin', 'ayane', 'hitomi',
  // registry six (r2026-10-03.35)
  'lydia', 'ruby', 'snowy',
  // remote community cast (r2026-10-05.104) — onyx is male; the rest female
  'aera', 'dhahlia', 'velara',
  // kitagawa (r110) — female
  'kitagawa',
]);

/**
 * Per-character vocal expressiveness — how strongly the pitch contour and
 * emotion deltas swing. Bubbly characters warble more, calm ones stay level.
 */
const EXPRESSIVENESS: Record<string, number> = {
  mochi: 1.4,
  marin: 1.38,
  rin: 1.35,
  ember: 1.34,
  kizuna: 1.32,
  blaze: 1.3,
  alicia: 1.28,
  juno: 1.25,
  yuki: 1.15,
  luna: 1.2,
  robbie: 1.2,
  ruby: 1.18,
  snowy: 1.15,
  alan: 1.15,
  hitomi: 1.15,
  lydia: 1.05,
  mei: 1.05,
  mio: 1.0,
  atlas: 0.95,
  sky: 0.95,
  cloud: 0.95,
  kasumi: 0.95,
  kai: 0.95,
  hina: 0.9,
  mika: 0.9,
  ayane: 0.9,
  ren: 0.9,
  nova: 0.85,
  anchor: 0.85,
  // remote community cast (r2026-10-05.104)
  aera: 1.1, dhahlia: 1.3, onyx: 0.9, velara: 0.95,
  // kitagawa — bubbly gyaru, warbles plenty (r110)
  kitagawa: 1.36,
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// ---- voice cache (speechSynthesis.getVoices() populates async on some browsers) ----
let cached: SpeechSynthesisVoice[] = [];
const refresh = () => { cached = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []; };
if (typeof speechSynthesis !== 'undefined') {
  refresh();
  speechSynthesis.onvoiceschanged = refresh;
}

function pickVoice(characterId: string, lang: Lang): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } {
  refresh();
  const choices = VOICE_MATRIX[characterId]?.[lang] ?? VOICE_MATRIX['juno']![lang] ?? [];
  for (const c of choices) {
    const byLang = cached.filter((v) => v.lang.replace('_', '-').startsWith(c.lang));
    for (const name of c.names) {
      const hit = byLang.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (hit) return { voice: hit, pitch: c.basePitch, rate: c.baseRate };
    }
    // named voices absent — any voice of that locale still beats the default
    if (byLang.length && c.names.some((n) => /female|male/i.test(n))) {
      const wantFemale = /female/i.test(c.names.join(' '));
      const gendered = byLang.find((v) => wantFemale ? /female|sin-ji|hiu|xia|nanami|mei|kate|samantha|ava|zira/i.test(v.name) : /male|sin-ju|yunxi|keita|guy|daniel/i.test(v.name));
      if (gendered) return { voice: gendered, pitch: c.basePitch, rate: c.baseRate };
      return { voice: byLang[0]!, pitch: c.basePitch, rate: c.baseRate };
    }
  }
  return { voice: null, pitch: 1, rate: 1 };
}

// Split into breath-sized clauses so the pitch contour can rise and fall inside a
// sentence — the sing-song quality that makes ChatGPT's voice feel alive.
// r2026-10-05.99: NO regex lookbehind — `(?<=…)` is a hard SyntaxError on
// WebKit before Safari 16.4 (iOS 16.4) and it killed the whole voice chain
// on those devices. Manual scanner: cut right AFTER any clause-ending
// punctuation, trimming whitespace (equivalent to the old split+trim).
const CLAUSE_END = /[。！？!?；;，,、—…\.]/;
function clauses(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (CLAUSE_END.test(ch)) {
      const s = cur.trim();
      if (s) out.push(s);
      cur = '';
    }
  }
  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

const MUTE_KEY = 'amoji.voice.v1';
const NEURAL_KEY = 'amoji.neural.v1';

export function voiceEnabled(): boolean {
  try { return localStorage.getItem(MUTE_KEY) !== 'off'; } catch { return true; }
}
export function setVoiceEnabled(on: boolean): void {
  try { localStorage.setItem(MUTE_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (!on) stopSpeaking();
}

/** Neural (edge-tts) voices on/off — default on, auto-falls back per-utterance. */
export function neuralEnabled(): boolean {
  try { return localStorage.getItem(NEURAL_KEY) !== 'off'; } catch { return true; }
}
export function setNeuralEnabled(on: boolean): void {
  try { localStorage.setItem(NEURAL_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (!on) stopEdge();
}

export function stopSpeaking(): void {
  stopEdge();
  stopGtts();
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/**
 * Short "hmm…" moment while the reply is still generating — ChatGPT does this
 * and it makes the character feel like she's actually thinking, not loading.
 * The mouth moves with the filler; the reply speech cuts it off automatically.
 * r2026-10-03.24: an optional felt mood tints the filler text itself (the
 * face/orb already wear the mood via applyLlmHints in the caller).
 */
export function speakThinkingFiller(characterId: string, lang: Lang, mood?: string): void {
  if (!voiceEnabled()) return;
  const filler = pickThinkingFiller(lang, mood);
  notifySpeaking(filler);
  speak(filler, characterId, lang, { confusion: 0.45, neutral: 0.3 });
}

/** A leading vocal tic (text + relative pitch/rate lift). */
export interface VocalLead {
  text: string;
  /** pitch multiplier, roughly -0.3..0.5 (synth: ×(1+pitch); neural: SSML delta) */
  pitch: number;
  /** rate multiplier, roughly -0.3..0.5 */
  rate: number;
}

/** Speak a reply with ChatGPT-style emotional prosody. Caller gates on voiceEnabled(). */
export function speak(
  text: string,
  characterId: string,
  lang: Lang,
  emotionHints?: Record<string, number>,
  leadOverride?: VocalLead,
  intensity = 1,
): void {
  if (!voiceEnabled()) return;
  // r97: a reply can be the very first sound after page load — unlockAudio()
  // used to run only on window gestures, so a session where the user typed
  // before ever tapping fetched every voice tier and stayed silent (autoplay
  // policy). Speaking a reply IS a user-intended audio act: take the unlock.
  unlockAudio();
  // r100: single choke-point trace — EVERY speak() call lands here with its
  // length and planned chain, and pings the status bus on the attempt itself
  // (tier 'attempt'), so a silent device answers "was speak() called?"
  // independently of "did sound start?" (the start callbacks below).
  const chain = neuralEnabled() && typeof WebSocket !== 'undefined' ? 'edge→gtts→synth' : 'synth';
  try { console.log(`[amoji voice] speak attempt · ${text.length} chars · ${lang} · chain ${chain}`); } catch { /* ignore */ }
  reportVoiceStatus('attempt', true, `speak attempt · ${text.length} chars · ${chain}`);
  // r102: hold the movement/ambient foley for one speak window — if every
  // tier fails silently this is what stops the "bell + typing" sound effects
  // from ringing over the failed attempt. Any tier's audio-START releases it.
  sfxVoiceHold();
  const { emotion, value } = dominant(emotionHints);
  const expr = EXPRESSIVENESS[characterId] ?? 1;
  const exprScale = 0.8 + 0.2 * expr; // expressive characters feel emotions harder
  // amplified feelings push pitch/energy further (intensity 1.5 → +25% swing);
  // plain moods (intensity 1) leave every delta exactly where it was
  const amp = 1 + 0.5 * Math.max(0, intensity - 1);
  // strong feelings get an audible tic (giggle/sigh/gasp) before the words —
  // unless the caller supplies its own lead (e.g. a guaranteed poke ouch)
  const tic = leadOverride ?? pickInterjection(emotion, value, lang);

  // 1) Neural path (free server-grade voices, SSML prosody per emotion)
  if (neuralEnabled() && typeof WebSocket !== 'undefined') {
    const np = NEURAL_PROSODY[emotion] ?? NEURAL_PROSODY['neutral']!;
    // r2026-10-04.64: any felt emotion also widens the sing-song contour itself
    // (×1.12) — the delivery warbles with the feeling, not just the average pitch
    const exprBoost = emotion === 'neutral' ? 1 : 1.12;
    // r99: build each tier's promise inside its own try/catch — a SYNCHRONOUS
    // throw (like the old lookbehind SyntaxError) must become a rejected
    // promise so the fallthrough chain still runs, instead of escaping
    // speak() and silencing every tier at once.
    let tier1: Promise<void>;
    try {
      tier1 = speakEdge(text, {
        lang,
        gender: FEMALE_CHARS.has(characterId) ? 'female' : 'male',
        character: characterId,
        expressiveness: expr * exprBoost,
        lead: tic,
        rateDelta: clamp(np.rate * exprScale * amp, -0.4, 0.5),
        pitchDelta: clamp(np.pitch * exprScale * amp, -0.3, 0.4),
        volumeDelta: clamp(np.vol * exprScale * amp, -0.5, 0.5),
        // r99/r100: the moment neural audio actually plays, the iOS media
        // gate is provably open AND the line is provably sounding — latch
        // both and show the green dot.
        onPlaying: () => { markVoiceStarted(); reportVoiceStatus('edge', true, 'neural voice playing'); },
        // r2026-10-04.89 — three-tier chain. Edge socket blocked on some mobile
        // networks → Google TTS (<audio> media, immune to the iPhone silent
        // switch) → browser speechSynthesis. A 'canceled' rejection just means
        // a newer line took over — never fall through and speak the stale one.
      });
    } catch (err) {
      tier1 = Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
    void tier1.then(() => {
      reportVoiceStatus('edge', true, 'neural voice finished');
    }).catch((err: unknown) => {
      if ((err as Error | undefined)?.message === 'canceled') return;
      reportVoiceStatus('edge', false, (err as Error | undefined)?.message ?? 'edge-tts failed');
      stopEdge();
      let tier2: Promise<void>;
      try {
        tier2 = speakGtts(text, {
          lang,
          rate: 1 + clamp(np.rate * exprScale * amp, -0.2, 0.25),
          lead: tic?.text,
          onPlaying: () => { markVoiceStarted(); reportVoiceStatus('gtts', true, 'google-tts playing'); },
        });
      } catch (err2) {
        tier2 = Promise.reject(err2 instanceof Error ? err2 : new Error(String(err2)));
      }
      void tier2.then(() => {
        reportVoiceStatus('gtts', true, 'google-tts finished');
      }).catch((err2: unknown) => {
        if ((err2 as Error | undefined)?.message === 'canceled') return;
        reportVoiceStatus('gtts', false, (err2 as Error | undefined)?.message ?? 'google-tts failed');
        stopGtts();
        try {
          synthSpeak(text, characterId, lang, emotion, expr, tic, amp);
          reportVoiceStatus('synth', true, 'browser voice queued');
        } catch (err3) {
          reportVoiceStatus('synth', false, (err3 as Error | undefined)?.message ?? 'browser voice failed');
        }
      });
    });
    return;
  }

  // 2) Browser-TTS fallback
  try {
    synthSpeak(text, characterId, lang, emotion, expr, tic, amp);
    reportVoiceStatus('synth', true, 'browser voice queued');
  } catch (err) {
    reportVoiceStatus('synth', false, (err as Error | undefined)?.message ?? 'browser voice failed');
  }
}

/**
 * Sing (r2026-10-03.40) — a melodic delivery of `text`: each clause becomes
 * one note of the SONG_MELODY contour, legato and slightly slower, joy
 * prosody underneath, her/his own voice. Neural path sends per-clause SSML
 * pitch deltas; the browser fallback replays the same contour as per-utterance
 * pitch multipliers. Callers gate on voiceEnabled().
 */
export function sing(text: string, characterId: string, lang: Lang): void {
  if (!voiceEnabled()) return;
  unlockAudio();
  const expr = EXPRESSIVENESS[characterId] ?? 1;
  if (neuralEnabled() && typeof WebSocket !== 'undefined') {
    let tier1: Promise<void>;
    try {
      tier1 = speakEdge(text, {
        lang,
        gender: FEMALE_CHARS.has(characterId) ? 'female' : 'male',
        character: characterId,
        expressiveness: expr,
        melody: SONG_MELODY,
        rateDelta: -0.06,
        pitchDelta: 0.02,
        // r100: singing counts too — a started song marks the voice started
        onPlaying: () => { markVoiceStarted(); reportVoiceStatus('edge', true, 'neural voice playing (singing)'); },
      });
    } catch (err) {
      tier1 = Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
    void tier1.catch((err: unknown) => {
      if ((err as Error | undefined)?.message === 'canceled') return;
      // endpoint unreachable — same melody on the browser voice
      stopEdge();
      try {
        synthSpeak(text, characterId, lang, 'joy', expr, undefined, 1, SONG_MELODY);
        reportVoiceStatus('synth', true, 'browser voice queued (singing)');
      } catch (err2) {
        reportVoiceStatus('synth', false, (err2 as Error | undefined)?.message ?? 'browser voice failed');
      }
    });
    return;
  }
  try {
    synthSpeak(text, characterId, lang, 'joy', expr, undefined, 1, SONG_MELODY);
    reportVoiceStatus('synth', true, 'browser voice queued (singing)');
  } catch (err) {
    reportVoiceStatus('synth', false, (err as Error | undefined)?.message ?? 'browser voice failed');
  }
}

/** one short happy line per language for the settings self-test (r2026-10-04.75) */
const TEST_LINES: Record<Lang, string> = {
  yue: '喂，聽唔聽到我呀？我而家好開心見到你！',
  zh: '喂，你能听到我吗？我现在好开心见到你！',
  ja: 'ねえ、聞こえる？会えて嬉しいな！',
  en: "Hey, can you hear me? I'm so happy to see you!",
};

/**
 * r2026-10-04.75 — one-tap voice self-test from the Settings sheet: forces
 * the iOS gesture unlock and speaks a short line in the current language with
 * the current character's voice. Works even while Voice replies is off (the
 * setting itself is left untouched — only the storage flag is borrowed for
 * the duration of the call, so stopSpeaking() can't cancel the test). If the
 * browser refuses to produce sound, `amoji:voice-blocked` fires and the
 * settings sheet shows the "check silent switch" hint.
 */
export function testVoice(characterId: string, lang: Lang): void {
  unlockAudio();
  const wasOn = voiceEnabled();
  if (!wasOn) {
    try { localStorage.setItem(MUTE_KEY, 'on'); } catch { /* ignore */ }
  }
  try {
    speak(TEST_LINES[lang] ?? TEST_LINES.en, characterId, lang, { joy: 0.6 });
  } finally {
    if (!wasOn) {
      // restore without stopSpeaking() — that would cancel the line we just queued
      try { localStorage.setItem(MUTE_KEY, 'off'); } catch { /* ignore */ }
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e: unknown) => { clearTimeout(t); reject(e instanceof Error ? e : new Error(String(e))); },
    );
  });
}

/**
 * r99: true only when the engine actually STARTED the utterance — onstart is
 * the one signal that sound is truly coming (onend alone can fire after a
 * muted, interrupted, or zero-volume 'start'). A 400ms resume() nudge covers
 * engines that queue the line in a suspended state.
 */
function probeSynth(text: string, characterId: string, lang: Lang): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (typeof speechSynthesis === 'undefined') { resolve(false); return; }
    const { voice, pitch, rate } = pickVoice(characterId, lang);
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.pitch = clamp(pitch, 0.4, 2);
    u.rate = clamp(rate, 0.6, 1.6);
    let started = false;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearInterval(nudge);
      clearTimeout(giveUp);
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
      resolve(ok);
    };
    const nudge = setInterval(() => { try { speechSynthesis.resume(); } catch { /* ignore */ } }, 400);
    const giveUp = setTimeout(() => finish(started), 6_000);
    u.onstart = () => { started = true; };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    try { speechSynthesis.resume(); } catch { /* ignore */ }
    speechSynthesis.speak(u);
  });
}

/**
 * r2026-10-05.99 — the Settings self-test, per tier. Walks edge → gtts →
 * synth with a short line, reporting each tried tier through the status bus
 * AND returning the full result list (Settings renders ✓/✗ per tier, so a
 * silent phone names its dead tier instead of just staying silent).
 * Skips gtts when edge already spoke, and skips synth when anything spoke.
 */
export async function testVoiceChain(characterId: string, lang: Lang): Promise<VoiceTierResult[]> {
  unlockAudio();
  const wasOn = voiceEnabled();
  if (!wasOn) {
    try { localStorage.setItem(MUTE_KEY, 'on'); } catch { /* ignore */ }
  }
  const results: VoiceTierResult[] = [];
  const line = TEST_LINES[lang] ?? TEST_LINES.en;
  const push = (tier: VoiceTier, ok: boolean, detail: string) => {
    results.push({ tier, ok, detail });
    reportVoiceStatus(tier, ok, detail);
  };
  try {
    if (neuralEnabled() && typeof WebSocket !== 'undefined') {
      // tier 1 — neural socket (7s cap)
      try {
        await withTimeout(speakEdge(line, {
          lang,
          gender: FEMALE_CHARS.has(characterId) ? 'female' : 'male',
          character: characterId,
        }), 7_000, 'edge-tts timeout');
        push('edge', true, 'neural voice played');
      } catch (err) {
        if ((err as Error | undefined)?.message !== 'canceled') {
          stopEdge();
          push('edge', false, (err as Error | undefined)?.message ?? 'edge-tts failed');
        }
      }
      // tier 2 — google TTS (10s cap) — only if tier 1 didn't already speak
      if (!results.some((r) => r.tier === 'edge' && r.ok)) {
        try {
          await withTimeout(speakGtts(line, { lang }), 10_000, 'google-tts timeout');
          push('gtts', true, 'google-tts played');
        } catch (err) {
          if ((err as Error | undefined)?.message !== 'canceled') {
            stopGtts();
            push('gtts', false, (err as Error | undefined)?.message ?? 'google-tts failed');
          }
        }
      }
    }
    // tier 3 — browser synth (only if nothing above spoke)
    if (!results.some((r) => r.ok)) {
      const ok = await probeSynth(line, characterId, lang);
      push('synth', ok, ok ? 'utterance started' : 'never started');
    }
  } finally {
    if (!wasOn) {
      try { localStorage.setItem(MUTE_KEY, 'off'); } catch { /* ignore */ }
    }
  }
  return results;
}

function synthSpeak(
  text: string,
  characterId: string,
  lang: Lang,
  emotion: string,
  expr: number,
  tic?: { text: string; pitch: number; rate: number },
  amp = 1,
  melody?: number[],
): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel(); // one speaker at a time

  const { voice, pitch: basePitch, rate: baseRate } = pickVoice(characterId, lang);
  const em = EMOTION_PROSODY[emotion] ?? EMOTION_PROSODY['neutral']!;
  // amplify the multipliers around 1 so intensity 1 is an exact no-op
  // (joy 1.2 → 1.25 at intensity 1.5; sadness 0.78 → 0.725 sinks further)
  const emPitch = 1 + (em.pitch - 1) * amp;
  const emRate = 1 + (em.rate - 1) * amp;
  const emVol = 1 + (em.vol - 1) * amp;
  const pitch = clamp(basePitch * emPitch, 0.4, 2);
  const rate = clamp(baseRate * emRate, 0.6, 1.6);
  const vol = clamp(emVol, 0.4, 1);

  const parts = clauses(text);
  const utterances: SpeechSynthesisUtterance[] = [];
  if (tic) {
    const t = new SpeechSynthesisUtterance(tic.text);
    if (voice) t.voice = voice;
    t.pitch = clamp(pitch * (1 + tic.pitch), 0.4, 2);
    t.rate = clamp(rate * (1 + tic.rate), 0.6, 1.6);
    t.volume = vol;
    utterances.push(t);
  }
  // Warm contour: statements drift down then settle; questions rise at the tail.
  // With a melody set, each clause instead rides one note of the tune (r.40).
  const rising = /[？?]\s*$/.test(text);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (lang === 'yue' ? 'zh-HK' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US');
    if (melody && melody.length > 0) {
      const note = melody[i % melody.length]!;
      u.pitch = clamp(pitch * (1 + note), 0.4, 2);
      u.rate = clamp(rate * 0.94, 0.6, 1.6);
      u.volume = vol;
      utterances.push(u);
      return;
    }
    const contour = parts.length > 1
      ? 1 + 0.06 * expr * Math.sin((i / (parts.length - 1)) * Math.PI * (rising ? 1 : 0.7))
      : 1;
    const isTail = i === parts.length - 1;
    const tailLift = isTail && rising ? 1.12 : isTail && !rising ? 0.94 : 1;
    u.pitch = clamp(pitch * contour * tailLift, 0.4, 2);
    u.rate = isTail ? clamp(rate * 0.96, 0.6, 1.6) : rate;
    u.volume = vol;
    utterances.push(u);
  });
  let pumpCount = 0;
  // r99: WebKit pauses the engine mid-queue (background tab, iOS audio-session
  // handoffs) — a gentle resume() every beat keeps the line draining until
  // the last utterance actually ends.
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  const stopKeepAlive = () => {
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
  };
  const pump = () => {
    pumpCount += 1;
    // r97: Android (and desktop Chrome after a cancel) can leave the engine
    // suspended — nudge it awake before every pump
    try { speechSynthesis.resume(); } catch { /* ignore */ }
    let live = 0;
    for (const u of utterances) {
      // r100: onstart is the one honest signal that browser audio actually
      // began — only it may mark the voice started (never a mere enqueue).
      u.onstart = () => {
        markVoiceStarted();
        synthPrimed = true; // r102: the engine genuinely started audio — no more priming
        reportVoiceStatus('synth', true, 'browser voice started');
      };
      // r2026-10-04.75: surface real failures (autoplay block, no voice, engine
      // error) as `amoji:voice-blocked`; ignore the benign cancel() churn from
      // stopSpeaking() cutting a line short.
      u.onerror = (e) => {
        live -= 1;
        if (live <= 0) stopKeepAlive();
        const err = (e as SpeechSynthesisErrorEvent).error;
        if (err !== 'interrupted' && err !== 'canceled') reportVoiceBlocked('synth');
      };
      u.onend = () => {
        live -= 1;
        if (live <= 0) stopKeepAlive();
      };
      live += 1;
      speechSynthesis.speak(u);
    }
    if (live > 0 && keepAlive === null) {
      keepAlive = setInterval(() => { try { speechSynthesis.resume(); } catch { /* ignore */ } }, 900);
    }
    // r97 watchdog: Chromium and WebKit both silently drop utterances pumped
    // right after a cancel() — the same-tick cancel-drop was never iOS-only.
    // If nothing is speaking or pending shortly after the pump, the drop
    // happened: pump once more (exactly once, so a genuinely broken engine
    // can never loop).
    setTimeout(() => {
      try {
        if (pumpCount === 1 && !speechSynthesis.speaking && !speechSynthesis.pending) pump();
      } catch { /* ignore */ }
    }, 600);
  };
  // r97: defer the pump one beat on EVERY platform. r85's defer guarded only
  // iOS, but pumping synchronously in the same tick as cancel() drops the
  // utterance on Chrome and Android too — 120ms is enough separation everywhere.
  setTimeout(pump, 120);
}
