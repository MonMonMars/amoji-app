'use client';
import { getPlaybackVolume } from './playback-volume';
// Emotional voice — ChatGPT-style prosody. Primary path: FREE neural voices via
// the edge-tts.ts endpoint — Cantonese 曉曼/雲龍 etc., with SSML pitch/rate/volume
// per emotion. Fallback path: the browser's own speechSynthesis with matched
// platform voices. Zero cost, zero API key.
// Wire-now order: Edge (locale + gender) → speechSynthesis on every device.
// Yue stays on Edge zh-HK, then Web Speech, then canto-tts-nano only when
// that runtime is bundled (it is not, so the hop is skipped). gtts.ts is not
// a hop. Google Cloud, Azure, and Polly are not called. OpenAI speech runs
// only when the user has saved a key.
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
import { characterVoiceGender } from './voice-gender';
import { createDefaultAudioContext, pinDefaultOutput } from './audio-output';
import { clampBrowserProsody, clampLaughDelivery, cleanForSpeech, isSpeakableText, prepareSpokenLead, speechLocale, stripVoicedGlyphs } from './speak-text';
import { edgeSampleText, isMaleNeuralVoice, synthNameConflicts, synthNameList, voiceNameMatches } from './voice-catalog';
import { LineQueue, speechRemainder } from './speech-queue';
import { clipFile, emotionClipKind, greetingText, nextGreetingKind } from './voice-clips';
import { playVoiceClip, stopVoiceClip } from './play-voice-clip';
export { speechRemainder };
import { edgeCastVoice } from './edge-cast';
import { speakEdge, stopEdge, getTtsProxy } from './edge-tts';
import { stopGtts } from './gtts';
import { cantoNanoAvailable, speakCantoNano } from './canto-nano';
import { formatVoiceChain, freeVoiceHops } from './tts-chain';
import { stopThinkingSound } from './thinking-sound';
// r2026-10-05.112: tier 0 — OpenAI gpt-4o-mini-tts (ChatGPT-style emotional
// voice via natural-language instructions). Sits AHEAD of the free chain;
// any failure (no key, CORS, network) falls through silently to edge-tts.
// r2026-10-06.131: the free chain itself now acts, too — edge-tts sends an
// mstts:express-as emotion style (cheerful/sad/angry/tender/terrified/shy…)
// resolved from the dominant emotion per voice, so even without a key her
// voice emotes instead of only pitching; plus an optional HTTP proxy
// (setTtsProxy) carries the SSML over https for wss-blocked networks.
import { speakOpenAi, stopOpenAi, openAiVoiceReady } from './openai-tts';
// r102: sfx.ts imports only a TYPE from moves (erased at compile), so there
// is no runtime cycle here.
import { sfxVoiceHold, sfxVoiceRelease } from './sfx';
import { dominant, pickInterjection, pickThinkingFiller } from './fillers';
import { SONG_MELODY } from './songs';
import { endLipSync, finishLipSync, holdLipSync, noteSpeechStarted, notifySpeaking } from './speech';
import { duckLibraryBed } from './music';

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

// ---- r2026-10-05.111: gesture-gate auto-replay --------------------------------
// Desktop Chrome (130+) gates speechSynthesis AND media playback on user
// activation; the transient half of that activation expires ~5s after a click.
// The PC diagnosis (voice-debug + the live status bus) showed the whole chain
// dying with 'not-allowed' when a reply lands after the activation window —
// every tier tried, every tier muted, the line lost forever. Fix: when a tier
// reports a gesture-gate failure, stash the line and re-speak it on the NEXT
// real pointerdown (a guaranteed-fresh gesture). One replay, 45s freshness,
// newer lines take priority naturally (lastSpeak is overwritten per speak()).
let lastSpeak: {
  text: string; characterId: string; lang: Lang;
  emotionHints?: Record<string, number>;
  leadOverride?: VocalLead;
  intensity: number; at: number;
} | null = null;
let replayArmed = false;

function armGestureReplay(reason: string): void {
  if (!lastSpeak) return;
  replayArmed = true;
  try { console.log(`[amoji voice] gesture-gated (${reason}) — will replay last line on next tap`); } catch { /* ignore */ }
  reportVoiceStatus('attempt', false, `muted by browser autoplay gate (${reason}) — tap anywhere to replay`);
}

// ---- r119: universal no-audio watchdog + tap-to-replay hint ------------------
// r111 caught tiers that REPORT a gesture-gate error, but silence can also
// arrive with no error at all: play() resolves yet nothing sounds, a socket
// hangs forever, an <audio> stalls mid-load. The only proof of sound is a
// tier's audio-START callback, so 8s after any speak attempt whose line is
// still the freshest, if no tier started audio we arm the gesture-gate replay
// AND raise the visible 'amoji:voice-replay-hint' chip (StatusPlate alone is
// too quiet — Master Simon repeatedly reported "no voice" while every
// diagnostic said the chain was fine). The replay handler double-checks
// voiceStartedSince before re-speaking, so a slow fetch that eventually
// starts can never be duplicated by the tap.
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

function armNoAudioWatchdog(attemptAt: number): void {
  if (watchdogTimer) clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => {
    watchdogTimer = null;
    if (voiceStartedSince(attemptAt)) return;                 // she spoke — done
    if (!lastSpeak || lastSpeak.at !== attemptAt) return;     // a newer line owns the floor
    armGestureReplay('no-audio watchdog');
    try {
      window.dispatchEvent(new CustomEvent('amoji:voice-replay-hint', { detail: { armed: true } }));
    } catch { /* ignore */ }
  }, 8000);
}

export function dismissReplayHint(): void {
  try {
    window.dispatchEvent(new CustomEvent('amoji:voice-replay-hint', { detail: { armed: false } }));
  } catch { /* ignore */ }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => {
    if (!replayArmed || !lastSpeak) return;
    replayArmed = false;
    dismissReplayHint();
    if (Date.now() - lastSpeak.at > 45_000) return; // stale — let it go
    if (voiceStartedSince(lastSpeak.at)) return;     // r119: already audible — no duplicate
    speak(lastSpeak.text, lastSpeak.characterId, lastSpeak.lang, lastSpeak.emotionHints, lastSpeak.leadOverride, lastSpeak.intensity);
  }, { passive: true });
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
  dismissReplayHint(); // r119: she IS audible — the tap-to-replay chip retires
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
  pinDefaultOutput(a);
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
      if (typeof window !== 'undefined') {
        const ctx = createDefaultAudioContext();
        if (ctx) {
        // a single zero-length buffer is enough to take the context out of
        // "suspended" on iOS without making any audible noise
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        void ctx.resume?.();
        }
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
/** Bumped on every new line and on stop so a poke lead cannot outlive itself. */
let synthGeneration = 0;
export function primeSynthInGesture(): void {
  if (synthPrimed || typeof speechSynthesis === 'undefined') return;
  // Latch immediately. This used to re-queue a rate-2, volume-0 blip on every
  // poke and keydown until a synth onstart, and Chrome kept that rate for the
  // next real line — the "talking after a poke sounds weird" bug.
  synthPrimed = true;
  try {
    speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.pitch = 1;
    u.rate = 1;
    u.lang = 'en-US';
    u.onerror = (e) => {
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err !== 'interrupted' && err !== 'canceled') synthPrimed = false;
    };
    speechSynthesis.speak(u);
  } catch {
    synthPrimed = false;
  }
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
// r2026-10-05.112: 'openai' leads the chain (paid emotional tier, optional).
export type VoiceTier = 'openai' | 'edge' | 'gtts' | 'synth' | 'canto-nano' | 'attempt';

export interface VoiceTierResult {
  tier: VoiceTier;
  ok: boolean;
  detail: string;
}

export const VOICE_TIER_LABEL: Record<VoiceTier, string> = {
  openai: 'chatgpt-voice',
  edge: 'edge-tts',
  gtts: 'google-tts',
  synth: 'browser',
  'canto-nano': 'canto-tts-nano',
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
  // Want-list males. Their own male names — never a female-only matrix.
  'a24-hairsample-male': {
    yue: [
      { lang: 'zh-HK', names: ['WanLung', 'Sin-ju', 'Male'], basePitch: 0.92, baseRate: 0.98 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Kangkang', 'Male'], basePitch: 0.92, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 0.94, baseRate: 0.98 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'David', 'Male'], basePitch: 0.94, baseRate: 0.98 },
    ],
  },
  'a98-ethan': {
    yue: [
      { lang: 'zh-HK', names: ['WanLung', 'Sin-ju', 'Male'], basePitch: 0.98, baseRate: 1.0 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Yunjian', 'Kangkang', 'Male'], basePitch: 0.98, baseRate: 1.0 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 1.0, baseRate: 1.0 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'David', 'Mark', 'Male'], basePitch: 1.0, baseRate: 1.0 },
      { lang: 'en-GB', names: ['Ryan', 'Daniel', 'Male'], basePitch: 1.0, baseRate: 1.0 },
    ],
  },
  'a94-rita': {
    yue: [
      { lang: 'zh-HK', names: ['WanLung', 'Sin-ju', 'Male'], basePitch: 0.96, baseRate: 0.96 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunyang', 'Yunjian', 'Kangkang', 'Male'], basePitch: 0.96, baseRate: 0.96 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 0.96, baseRate: 0.97 },
    ],
    en: [
      { lang: 'en-US', names: ['Eric', 'Guy', 'David', 'Male'], basePitch: 0.96, baseRate: 0.97 },
    ],
  },
  'a107-dm-office-casual': {
    yue: [
      { lang: 'zh-HK', names: ['WanLung', 'Sin-ju', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Kangkang', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 0.92, baseRate: 0.96 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Christopher', 'David', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
  },
  'a459-chinesewarriormonk': {
    yue: [
      { lang: 'zh-HK', names: ['WanLung', 'Sin-ju', 'Male'], basePitch: 0.88, baseRate: 0.94 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Kangkang', 'Male'], basePitch: 0.88, baseRate: 0.94 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-GB', names: ['Ryan', 'Daniel', 'Male'], basePitch: 0.9, baseRate: 0.95 },
      { lang: 'en-US', names: ['Christopher', 'Guy', 'David', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
  },
  'a468-eric': {
    yue: [
      { lang: 'zh-HK', names: ['WanLung', 'Sin-ju', 'Male'], basePitch: 1.0, baseRate: 0.98 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Yunjian', 'Kangkang', 'Male'], basePitch: 1.0, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 1.0, baseRate: 0.99 },
    ],
    en: [
      { lang: 'en-US', names: ['Christopher', 'Eric', 'Guy', 'Male'], basePitch: 0.98, baseRate: 0.99 },
    ],
  },
};

/** Emotion → prosody for the browser-TTS fallback path (multipliers). */
const EMOTION_PROSODY: Record<string, { pitch: number; rate: number; vol: number }> = {
  joy: { pitch: 1.2, rate: 1.15, vol: 1.0 },
  excitement: { pitch: 1.26, rate: 1.18, vol: 1.1 },
  love: { pitch: 1.1, rate: 0.88, vol: 0.95 },
  contentment: { pitch: 1.06, rate: 0.9, vol: 0.92 },
  relief: { pitch: 1.03, rate: 0.94, vol: 0.9 },
  sadness: { pitch: 0.78, rate: 0.85, vol: 0.8 },
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
  joy: { rate: 0.15, pitch: 0.16, vol: 0.16 },
  excitement: { rate: 0.24, pitch: 0.2, vol: 0.3 },
  love: { rate: -0.09, pitch: 0.07, vol: -0.08 },
  contentment: { rate: -0.1, pitch: 0.02, vol: -0.14 },
  relief: { rate: -0.08, pitch: 0.02, vol: -0.14 },
  sadness: { rate: -0.15, pitch: -0.12, vol: -0.32 },
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

const SYNTH_LOCALE: Record<Lang, string> = {
  yue: 'zh-HK',
  zh: 'zh-CN',
  ja: 'ja-JP',
  en: 'en-US',
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) + id.charCodeAt(i)) >>> 0;
  return h;
}

function rotateNames(names: string[], by: number): string[] {
  if (names.length < 2) return names;
  const n = by % names.length;
  return names.slice(n).concat(names.slice(0, n));
}

function pickVoice(characterId: string, lang: Lang): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } {
  refresh();
  const gender = characterVoiceGender(characterId);
  const color = edgeCastVoice(characterId, lang);
  const prefix = SYNTH_LOCALE[lang];
  const byLang = cached.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(prefix.toLowerCase()));
  const pool = byLang.length ? byLang : cached;
  // Same pitch/pace as the Edge slot, so the browser fallback stays personal.
  const pitch = (gender === 'male' ? 0.94 : 1.06) + (color?.pitch ?? 0);
  const rate = (gender === 'male' ? 0.98 : 1.02) + (color?.rate ?? 0);
  for (const name of rotateNames(synthNameList(lang, gender), hashId(characterId))) {
    const hit = pool.find((v) => voiceNameMatches(v.name, name) && !synthNameConflicts(gender, v.name));
    if (hit) return { voice: hit, pitch, rate };
  }
  const safe = pool.find((v) => !synthNameConflicts(gender, v.name));
  if (safe) return { voice: safe, pitch, rate };
  const matrixFallback = gender === 'male' ? 'atlas' : 'juno';
  const choices = VOICE_MATRIX[characterId]?.[lang] ?? VOICE_MATRIX[matrixFallback]?.[lang] ?? [];
  for (const c of choices) {
    const scoped = cached.filter((v) => v.lang.replace('_', '-').startsWith(c.lang));
    for (const name of c.names) {
      const hit = scoped.find((v) => voiceNameMatches(v.name, name) && !synthNameConflicts(gender, v.name));
      if (hit) return { voice: hit, pitch: c.basePitch, rate: c.baseRate };
    }
  }
  return { voice: null, pitch, rate };
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

let synthKeepAlive: ReturnType<typeof setInterval> | null = null;
let lipHold: ReturnType<typeof setInterval> | null = null;

function clearSynthKeepAlive(): void {
  if (synthKeepAlive) { clearInterval(synthKeepAlive); synthKeepAlive = null; }
}

function clearLipHold(): void {
  if (lipHold) { clearInterval(lipHold); lipHold = null; }
}

/**
 * Drop the browser queue. cancel() alone leaves Chrome paused and often
 * keeps the cancelled utterance's rate/pitch, so the next line squeaks.
 * Bumping the generation retires any chained pump still in flight.
 */
function haltSynthQueue(): void {
  synthGeneration += 1;
  clearSynthKeepAlive();
  clearLipHold();
  if (typeof speechSynthesis === 'undefined') return;
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  try { speechSynthesis.resume(); } catch { /* ignore */ }
}

interface SpeechJob {
  kind: 'speak' | 'sing' | 'clip';
  text: string;
  characterId: string;
  lang: Lang;
  emotionHints?: Record<string, number>;
  leadOverride?: VocalLead;
  intensity: number;
  /** Premade file for kind 'clip'. Played to the end before the next line. */
  clipFile?: string;
}

const lineQueue = new LineQueue<SpeechJob>();
const idleWaiters: Array<() => void> = [];

function flushIdleWaiters(): void {
  if (lineQueue.pending()) return;
  const waiters = idleWaiters.splice(0, idleWaiters.length);
  for (const waiter of waiters) {
    try { waiter(); } catch { /* ignore */ }
  }
}

function cancelIdleWaiters(): void {
  idleWaiters.length = 0;
}

/**
 * Run `cb` when no companion line is playing or queued.
 * A user interrupt drops the waiter so a song bed cannot start after they talk.
 */
export function whenSpeechIdle(cb: () => void): void {
  if (!lineQueue.pending()) {
    cb();
    return;
  }
  idleWaiters.push(cb);
}

/** True while a companion line is playing or waiting behind it. */
export function speechPending(): boolean {
  return lineQueue.pending();
}

/** True when this exact sentence is the active line or still queued. */
export function speechStillQueued(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return lineQueue.includes((job) => job.text.trim() === t);
}

function drainSpeech(): void {
  const next = lineQueue.begin();
  if (!next) {
    flushIdleWaiters();
    return;
  }
  const job = next.item;
  const run = job.kind === 'sing'
    ? performSing(job.text, job.characterId, job.lang)
    : job.kind === 'clip'
      ? performClip(job)
      : performSpeak(job.text, job.characterId, job.lang, job.emotionHints, job.leadOverride, job.intensity);
  void run.finally(() => {
    lineQueue.finished(next.epoch);
    if (lineQueue.epochNow() === next.epoch) drainSpeech();
  });
}

export function stopSpeaking(): void {
  lineQueue.interrupt();
  cancelIdleWaiters();
  stopThinkingSound();
  stopVoiceClip();
  stopOpenAi();
  stopEdge();
  stopGtts();
  haltSynthQueue();
  endLipSync();
}

/**
 * Short "um……" while the reply is still generating. The mouth moves with the
 * stub. The reply waits until this utterance finishes.
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
  // Companion lines wait their turn. stopSpeaking() is the only cut, and
  // only the user's mic or a user turn calls it.
  const cleaned = cleanForSpeech(text);
  if (!cleaned || !voiceEnabled()) return;
  lineQueue.enqueue({
    kind: 'speak',
    text: cleaned,
    characterId,
    lang,
    emotionHints,
    leadOverride,
    intensity,
  });
  drainSpeech();
}

function performSpeak(
  text: string,
  characterId: string,
  lang: Lang,
  emotionHints?: Record<string, number>,
  leadOverride?: VocalLead,
  intensity = 1,
): Promise<void> {
  return new Promise((resolve) => {
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  // Reply TTS takes the speaker. The wait hum must not play under it.
  stopThinkingSound();
  // Spoken string only. cleanForSpeech may drop punctuation-mark names and
  // rewrite dashes. Chat bubbles stay on cleanForDisplay — do not write this
  // string back into history.
  text = cleanForSpeech(text);
  if (!text || !voiceEnabled()) { settle(); return; }
  // r111: remember the line for gesture-gate replay
  const attemptAt = Date.now();
  lastSpeak = { text, characterId, lang, emotionHints, leadOverride, intensity, at: attemptAt };
  // r119: a fresh attempt retires any previous replay hint, and the watchdog
  // re-arms for THIS line — if no tier's audio starts within 8s the visible
  // tap-to-replay chip appears (catches silent failures that throw no error)
  dismissReplayHint();
  armNoAudioWatchdog(attemptAt);
  // r97: a reply can be the very first sound after page load — unlockAudio()
  // used to run only on window gestures, so a session where the user typed
  // before ever tapping fetched every voice tier and stayed silent (autoplay
  // policy). Speaking a reply IS a user-intended audio act: take the unlock.
  unlockAudio();
  // A premade song/dance bed ducks while a real line plays (poke, dance
  // reply) so the words stay intelligible. Singing itself does not come
  // through speak(), so a song stays full until something else talks.
  duckLibraryBed();
  // r100: single choke-point trace — EVERY speak() call lands here with its
  // length and planned chain, and pings the status bus on the attempt itself
  // (tier 'attempt'), so a silent device answers "was speak() called?"
  // independently of "did sound start?" (the start callbacks below).
  const useOpenAi = openAiVoiceReady();
  const edgeOn = neuralEnabled() && typeof WebSocket !== 'undefined';
  const chain = formatVoiceChain(
    freeVoiceHops(lang, { cantoNano: cantoNanoAvailable(), edge: edgeOn }),
    useOpenAi ? 'openai' : null,
  );
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
  let tic = leadOverride
    ? prepareSpokenLead(leadOverride)
    : prepareSpokenLead(pickInterjection(emotion, value, lang));
  const speechEpoch = lineQueue.epochNow();
  const speechAlive = () => lineQueue.epochNow() === speechEpoch;
  const onHeard = () => { noteSpeechStarted(tic ? `${tic.text} ${text}` : text); };

  const beginTts = () => {
  if (!speechAlive()) { settle(); return; }

  // Free chain: Edge (locale + gender) → speechSynthesis. Yue adds
  // canto-tts-nano only when that runtime is bundled. OpenAI is opt-in and
  // not the default. A 'canceled' rejection means a newer line took over.
  const runSynth = (onDone: () => void): boolean => {
    if (typeof speechSynthesis === 'undefined') return false;
    try {
      synthSpeak(text, characterId, lang, emotion, expr, tic, amp, undefined, onDone);
      reportVoiceStatus('synth', true, 'browser voice queued');
      return true;
    } catch (err3) {
      reportVoiceStatus('synth', false, (err3 as Error | undefined)?.message ?? 'browser voice failed');
      return false;
    }
  };
  const runFreeChain = (): void => {
    const hops = freeVoiceHops(lang, { cantoNano: cantoNanoAvailable(), edge: edgeOn });
    const runAt = (index: number): void => {
      const hop = hops[index];
      if (!hop) { settle(); return; }
      const next = (): void => runAt(index + 1);
      if (hop === 'synth') {
        if (!runSynth(settle)) next();
        return;
      }
      if (hop === 'canto-nano') {
        void speakCantoNano(stripVoicedGlyphs(text)).then(() => {
          markVoiceStarted();
          reportVoiceStatus('canto-nano', true, 'canto-tts-nano finished');
          settle();
        }).catch((err: unknown) => {
          if ((err as Error | undefined)?.message === 'canceled') { settle(); return; }
          reportVoiceStatus('canto-nano', false, (err as Error | undefined)?.message ?? 'canto-tts-nano failed');
          next();
        });
        return;
      }
      const np = NEURAL_PROSODY[emotion] ?? NEURAL_PROSODY['neutral']!;
      const exprBoost = emotion === 'neutral' ? 1 : 1.12;
      let tier1: Promise<void>;
      try {
        tier1 = speakEdge(text, {
          lang,
          gender: characterVoiceGender(characterId),
          character: characterId,
          expressiveness: expr * exprBoost,
          emotion,
          lead: tic,
          rateDelta: clamp(np.rate * exprScale * amp, -0.4, 0.5),
          pitchDelta: clamp(np.pitch * exprScale * amp, -0.3, 0.4),
          volumeDelta: clamp(np.vol * exprScale * amp, -0.5, 0.5),
          onPlaying: () => { onHeard(); markVoiceStarted(); reportVoiceStatus('edge', true, 'neural voice playing'); },
        });
      } catch (err) {
        tier1 = Promise.reject(err instanceof Error ? err : new Error(String(err)));
      }
      void tier1.then(() => {
        reportVoiceStatus('edge', true, 'neural voice finished');
        settle();
      }).catch((err: unknown) => {
        if ((err as Error | undefined)?.message === 'canceled') { settle(); return; }
        reportVoiceStatus('edge', false, (err as Error | undefined)?.message ?? 'edge-tts failed');
        stopEdge();
        next();
      });
    };
    runAt(0);
  };

  if (useOpenAi) {
    let tier0: Promise<void>;
    try {
      tier0 = speakOpenAi(text, {
        lang,
        gender: characterVoiceGender(characterId),
        character: characterId,
        emotion,
        expressiveness: expr,
        onPlaying: () => { onHeard(); markVoiceStarted(); reportVoiceStatus('openai', true, 'chatgpt voice playing'); },
      });
    } catch (err) {
      tier0 = Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
    void tier0.then(() => {
      reportVoiceStatus('openai', true, 'chatgpt voice finished');
      settle();
    }).catch((err: unknown) => {
      if ((err as Error | undefined)?.message === 'canceled') { settle(); return; }
      reportVoiceStatus('openai', false, (err as Error | undefined)?.message ?? 'openai-tts failed');
      if ((err as { name?: string } | undefined)?.name === 'NotAllowedError') armGestureReplay('openai not-allowed');
      stopOpenAi();
      runFreeChain();
    });
    return;
  }

  runFreeChain();
  };

  const leadKind = tic ? emotionClipKind(tic.text, 'lead') : null;
  const lineKind = leadKind ? null : emotionClipKind(text, 'line');
  const clipKind = leadKind ?? lineKind;
  if (clipKind) {
    const gender = characterVoiceGender(characterId);
    const caption = leadKind && tic ? tic.text : text;
    void playVoiceClip(clipFile(lang, gender, clipKind), caption, () => markVoiceStarted()).then(() => {
      if (!speechAlive()) { settle(); return; }
      if (lineKind) { settle(); return; }
      tic = undefined;
      beginTts();
    }).catch((err: unknown) => {
      if (!speechAlive() || (err as Error | undefined)?.message === 'canceled') { settle(); return; }
      beginTts();
    });
  } else {
    beginTts();
  }
  });
}

function performClip(job: SpeechJob): Promise<void> {
  return new Promise((resolve) => {
    const epoch = lineQueue.epochNow();
    stopThinkingSound();
    unlockAudio();
    const file = job.clipFile;
    if (!file || !voiceEnabled()) { resolve(); return; }
    void playVoiceClip(file, job.text, () => markVoiceStarted()).then(() => resolve()).catch((err: unknown) => {
      if (lineQueue.epochNow() !== epoch || (err as Error | undefined)?.message === 'canceled') {
        resolve();
        return;
      }
      void performSpeak(job.text, job.characterId, job.lang).then(() => resolve());
    });
  });
}

/**
 * Short greeting when a character or a TTS button is pressed.
 * Queued behind whatever is already speaking. Only stopSpeaking() — the
 * user's own turn — cuts it.
 */
export function playSelectGreeting(characterId: string, lang: Lang, gender: 'female' | 'male'): void {
  if (!voiceEnabled()) return;
  const kind = nextGreetingKind();
  unlockAudio();
  lineQueue.enqueue({
    kind: 'clip',
    text: greetingText(lang, kind),
    characterId,
    lang,
    intensity: 1,
    clipFile: clipFile(lang, gender, kind),
  });
  drainSpeech();
}

/**
 * Sing (r2026-10-03.40) — a melodic delivery of `text`: each clause becomes
 * one note of the SONG_MELODY contour, legato and slightly slower, joy
 * prosody underneath, her/his own voice. Neural path sends per-clause SSML
 * pitch deltas; the browser fallback replays the same contour as per-utterance
 * pitch multipliers. Callers gate on voiceEnabled().
 */
export function sing(text: string, characterId: string, lang: Lang): void {
  const cleaned = cleanForSpeech(text);
  if (!cleaned || !voiceEnabled()) return;
  lineQueue.enqueue({ kind: 'sing', text: cleaned, characterId, lang, intensity: 1 });
  drainSpeech();
}

function performSing(text: string, characterId: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    stopThinkingSound();
    text = cleanForSpeech(text);
    if (!text || !voiceEnabled()) { settle(); return; }
    unlockAudio();
    const expr = EXPRESSIVENESS[characterId] ?? 1;
    if (neuralEnabled() && typeof WebSocket !== 'undefined') {
      let tier1: Promise<void>;
      try {
        tier1 = speakEdge(text, {
          lang,
          gender: characterVoiceGender(characterId),
          character: characterId,
          expressiveness: expr,
          melody: SONG_MELODY,
          rateDelta: -0.06,
          pitchDelta: 0.02,
          // r100: singing counts too — a started song marks the voice started
          onPlaying: () => { noteSpeechStarted(text); markVoiceStarted(); reportVoiceStatus('edge', true, 'neural voice playing (singing)'); },
        });
      } catch (err) {
        tier1 = Promise.reject(err instanceof Error ? err : new Error(String(err)));
      }
      void tier1.then(() => settle()).catch((err: unknown) => {
        if ((err as Error | undefined)?.message === 'canceled') { settle(); return; }
        // endpoint unreachable — same melody on the browser voice
        stopEdge();
        try {
          synthSpeak(text, characterId, lang, 'joy', expr, undefined, 1, SONG_MELODY, settle);
          reportVoiceStatus('synth', true, 'browser voice queued (singing)');
        } catch (err2) {
          reportVoiceStatus('synth', false, (err2 as Error | undefined)?.message ?? 'browser voice failed');
          settle();
        }
      });
      return;
    }
    try {
      synthSpeak(text, characterId, lang, 'joy', expr, undefined, 1, SONG_MELODY, settle);
      reportVoiceStatus('synth', true, 'browser voice queued (singing)');
    } catch (err) {
      reportVoiceStatus('synth', false, (err as Error | undefined)?.message ?? 'browser voice failed');
      settle();
    }
  });
}

/**
 * Bake-off sample. Speaks the locale's sheet line in the exact Edge short
 * name, even when Voice replies is off and even when the voice gender does
 * not match the companion. Does not fall through to speechSynthesis — that
 * tier cannot name these neural voices.
 */
export function previewEdgeVoice(locale: Lang, voiceId: string): Promise<void> {
  unlockAudio();
  stopSpeaking();
  const gender = isMaleNeuralVoice(voiceId) ? 'male' : 'female';
  return speakEdge(edgeSampleText(locale), {
    lang: locale,
    gender,
    voiceId,
    expressiveness: 1,
  });
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
  // The settings button is a user action: it may cut the current line, then
  // speak the test. Restoring the mute flag below must not call stopSpeaking.
  stopSpeaking();
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
    const shaped = clampBrowserProsody(pitch, rate);
    const u = new SpeechSynthesisUtterance(stripVoicedGlyphs(text) || text);
    bindSynthVoice(u, voice, speechLocale(lang));
    u.pitch = shaped.pitch;
    u.rate = shaped.rate;
    let started = false;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearInterval(nudge);
      clearTimeout(giveUp);
      haltSynthQueue();
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
 * Settings self-test. Walks the free chain (Edge → speechSynthesis, then
 * canto-tts-nano for Yue when that runtime is bundled) and returns every
 * tier it actually tried. Stops at the first tier that speaks.
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
    // r112: tier 0 — OpenAI ChatGPT-style voice (10s cap), tried first when
    // a key is configured. A CORS/network failure reports ✗ and the probe
    // simply continues down the free chain.
    if (openAiVoiceReady()) {
      try {
        await withTimeout(speakOpenAi(line, {
          lang,
          gender: characterVoiceGender(characterId),
          character: characterId,
        }), 10_000, 'openai-tts timeout');
        push('openai', true, 'chatgpt voice played');
      } catch (err) {
        if ((err as Error | undefined)?.message !== 'canceled') {
          stopOpenAi();
          push('openai', false, (err as Error | undefined)?.message ?? 'openai-tts failed');
        }
      }
    }
    const hops = freeVoiceHops(lang, {
      cantoNano: cantoNanoAvailable(),
      edge: neuralEnabled() && typeof WebSocket !== 'undefined',
    });
    for (const hop of hops) {
      if (results.some((r) => r.ok)) break;
      if (hop === 'edge') {
        try {
          await withTimeout(speakEdge(line, {
            lang,
            gender: characterVoiceGender(characterId),
            character: characterId,
          }), 7_000, 'edge-tts timeout');
          push('edge', true, 'neural voice played');
        } catch (err) {
          if ((err as Error | undefined)?.message !== 'canceled') {
            stopEdge();
            push('edge', false, (err as Error | undefined)?.message ?? 'edge-tts failed');
          }
        }
        continue;
      }
      if (hop === 'canto-nano') {
        try {
          await withTimeout(speakCantoNano(stripVoicedGlyphs(line)), 10_000, 'canto-tts-nano timeout');
          push('canto-nano', true, 'canto-tts-nano played');
        } catch (err) {
          if ((err as Error | undefined)?.message !== 'canceled') {
            push('canto-nano', false, (err as Error | undefined)?.message ?? 'canto-tts-nano failed');
          }
        }
        continue;
      }
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

/**
 * r2026-10-06.133 — Settings proxy probe. Speaks one short line through the
 * edge tier EXACTLY as a live reply would (so a saved proxy URL is exercised
 * end-to-end), bypassing the OpenAI tier, the neural-enabled gate and the
 * lower fallbacks — the generic chain probe can never isolate the proxy
 * because it stops at the first tier that speaks. Reports on the same
 * voice-status bus so the status plate agrees. Resolves true only when the
 * utterance completed without error.
 */
export async function testProxyVoice(characterId: string, lang: Lang): Promise<boolean> {
  unlockAudio();
  const line = TEST_LINES[lang] ?? TEST_LINES.en;
  const viaProxy = !!getTtsProxy();
  try {
    await withTimeout(speakEdge(line, {
      lang,
      gender: characterVoiceGender(characterId),
      character: characterId,
    }), 12_000, 'edge-tts timeout');
    reportVoiceStatus('edge', true, viaProxy ? 'voice played via proxy' : 'voice played (direct)');
    return true;
  } catch (err) {
    if ((err as Error | undefined)?.message !== 'canceled') {
      stopEdge();
      reportVoiceStatus('edge', false, (err as Error | undefined)?.message ?? 'edge-tts failed');
    }
    return false;
  }
}

/**
 * r2026-10-06.134 — Settings ChatGPT-voice probe. Speaks one short line
 * through the OpenAI tier exactly as a live reply would (key + endpoint as
 * currently saved), reporting on the voice-status bus. Resolves null when
 * no key is configured (nothing to test), false on failure, true when the
 * line played start to finish.
 */
export async function testOpenAiVoice(characterId: string, lang: Lang): Promise<boolean | null> {
  if (!openAiVoiceReady()) return null;
  unlockAudio();
  const line = TEST_LINES[lang] ?? TEST_LINES.en;
  try {
    await withTimeout(speakOpenAi(line, {
      lang,
      gender: characterVoiceGender(characterId),
      character: characterId,
    }), 12_000, 'openai-tts timeout');
    reportVoiceStatus('openai', true, 'chatgpt voice played');
    return true;
  } catch (err) {
    if ((err as Error | undefined)?.message !== 'canceled') {
      stopOpenAi();
      reportVoiceStatus('openai', false, (err as Error | undefined)?.message ?? 'openai-tts failed');
    }
    return false;
  }
}

function bindSynthVoice(u: SpeechSynthesisUtterance, voice: SpeechSynthesisVoice | null, locale: string): void {
  u.lang = locale;
  if (!voice) return;
  const voiceLang = voice.lang.replace(/_/g, '-').toLowerCase();
  if (voiceLang.startsWith(locale.toLowerCase())) u.voice = voice;
}

/** Silent utterance that puts pitch, rate, and voice back to the character default. */
function restoreSynthEngine(gen: number, voice: SpeechSynthesisVoice | null, locale: string): void {
  if (gen !== synthGeneration || typeof speechSynthesis === 'undefined') return;
  try {
    const r = new SpeechSynthesisUtterance(' ');
    r.volume = 0;
    r.pitch = 1;
    r.rate = 1;
    bindSynthVoice(r, voice, locale);
    speechSynthesis.speak(r);
  } catch { /* ignore */ }
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
  onDone?: () => void,
): void {
  let lineDone = false;
  let safety: ReturnType<typeof setTimeout> | undefined;
  const finishLine = () => {
    if (lineDone) return;
    lineDone = true;
    if (safety) clearTimeout(safety);
    try { onDone?.(); } catch { /* ignore */ }
  };
  if (typeof speechSynthesis === 'undefined') { finishLine(); return; }
  haltSynthQueue();
  const gen = synthGeneration;

  const { voice, pitch: basePitch, rate: baseRate } = pickVoice(characterId, lang);
  const locale = speechLocale(lang);
  const em = EMOTION_PROSODY[emotion] ?? EMOTION_PROSODY['neutral']!;
  // amplify the multipliers around 1 so intensity 1 is an exact no-op
  const emPitch = 1 + (em.pitch - 1) * amp;
  const emRate = 1 + (em.rate - 1) * amp;
  const emVol = 1 + (em.vol - 1) * amp;
  const shaped = clampBrowserProsody(basePitch * emPitch, baseRate * emRate);
  const pitch = shaped.pitch;
  const rate = shaped.rate;
  const vol = clamp(emVol * getPlaybackVolume(), 0.05, 1);

  const parts = clauses(text).filter(isSpeakableText);
  const utterances: SpeechSynthesisUtterance[] = [];
  const leadSpoken = tic ? stripVoicedGlyphs(tic.text) : '';
  if (leadSpoken && tic) {
    const t = new SpeechSynthesisUtterance(leadSpoken);
    bindSynthVoice(t, voice, locale);
    const laugh = clampLaughDelivery(pitch * (1 + tic.pitch), rate * (1 + tic.rate));
    t.pitch = laugh.pitch;
    t.rate = laugh.rate;
    t.volume = vol;
    utterances.push(t);
  }
  // One utterance at a time. Queueing the laugh with the line made Chrome
  // keep the laugh pitch for every clause, and for the chat line after.
  const rising = /[？?]\s*$/.test(text);
  parts.forEach((part, i) => {
    const spoken = stripVoicedGlyphs(part);
    if (!spoken) return;
    const u = new SpeechSynthesisUtterance(spoken);
    bindSynthVoice(u, voice, locale);
    if (melody && melody.length > 0) {
      const note = melody[i % melody.length]!;
      const sung = clampBrowserProsody(pitch * (1 + note), rate * 0.94);
      u.pitch = sung.pitch;
      u.rate = sung.rate;
      u.volume = vol;
      utterances.push(u);
      return;
    }
    const contour = parts.length > 1
      ? 1 + 0.04 * expr * Math.sin((i / (parts.length - 1)) * Math.PI * (rising ? 1 : 0.7))
      : 1;
    const isTail = i === parts.length - 1;
    const tailLift = isTail && rising ? 1.06 : isTail && !rising ? 0.97 : 1;
    const delivered = clampBrowserProsody(pitch * contour * tailLift, isTail ? rate * 0.98 : rate);
    u.pitch = delivered.pitch;
    u.rate = delivered.rate;
    u.volume = vol;
    utterances.push(u);
  });
  if (!utterances.length) { finishLine(); return; }

  let index = 0;
  let started = false;
  let retries = 0;
  let liveLip = 0;

  // A dropped utterance never fires onend. Release the queue then.
  // While the engine is still speaking, wait — a long line must not be cut.
  const armSafety = () => {
    if (safety) clearTimeout(safety);
    safety = setTimeout(() => {
      if (lineDone || gen !== synthGeneration) { finishLine(); return; }
      try {
        if (started && (speechSynthesis.speaking || speechSynthesis.pending)) {
          armSafety();
          return;
        }
      } catch { /* ignore */ }
      finishLine();
    }, 8_000);
  };
  armSafety();

  const armKeepAlive = () => {
    if (gen !== synthGeneration || synthKeepAlive) return;
    // Resume only while the engine is actually paused. An unconditional
    // resume() restarts the current utterance on Chrome and stacks clips.
    synthKeepAlive = setInterval(() => {
      if (gen !== synthGeneration) { clearSynthKeepAlive(); return; }
      try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch { /* ignore */ }
    }, 900);
  };

  const armLipHold = () => {
    if (gen !== synthGeneration || lipHold) return;
    lipHold = setInterval(() => {
      if (gen !== synthGeneration || !liveLip) { clearLipHold(); return; }
      holdLipSync(liveLip, 900);
    }, 320);
  };

  const closeMouth = () => {
    clearLipHold();
    if (liveLip) finishLipSync(liveLip);
  };

  const speakOne = () => {
    if (gen !== synthGeneration) { finishLine(); return; }
    if (index >= utterances.length) {
      clearSynthKeepAlive();
      closeMouth();
      restoreSynthEngine(gen, voice, locale);
      finishLine();
      return;
    }
    const u = utterances[index]!;
    const last = index === utterances.length - 1;
    let settled = false;
    const finish = (advance: boolean) => {
      if (gen !== synthGeneration) { finishLine(); return; }
      if (settled) return;
      settled = true;
      if (!advance) {
        clearSynthKeepAlive();
        closeMouth();
        finishLine();
        return;
      }
      index += 1;
      if (!last) holdLipSync(liveLip, 700);
      speakOne();
    };
    u.onstart = () => {
      if (gen !== synthGeneration) return;
      if (!started) {
        liveLip = noteSpeechStarted(tic ? `${tic.text} ${text}` : text);
        armLipHold();
      }
      started = true;
      markVoiceStarted();
      synthPrimed = true;
      reportVoiceStatus('synth', true, 'browser voice started');
      armKeepAlive();
      armSafety();
    };
    u.onerror = (e) => {
      if (gen !== synthGeneration) return;
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err === 'interrupted' || err === 'canceled') {
        finish(false);
        return;
      }
      reportVoiceBlocked('synth');
      if (err === 'not-allowed') armGestureReplay('synth not-allowed');
      finish(false);
    };
    u.onend = () => finish(true);
    try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch { /* ignore */ }
    speechSynthesis.speak(u);
  };

  const pump = () => {
    if (gen !== synthGeneration) return;
    speakOne();
    // Chromium and WebKit drop an utterance pumped in the same beat as
    // cancel(). One retry, and only if this line is still the current one.
    setTimeout(() => {
      if (gen !== synthGeneration || started || retries >= 1) return;
      try {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          retries += 1;
          index = 0;
          speakOne();
        }
      } catch { /* ignore */ }
    }, 600);
  };
  // Defer one beat after cancel() on every platform — same-tick speak() is
  // dropped, and it is also how a cancelled rate used to stick.
  setTimeout(pump, 120);
}
