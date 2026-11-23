// Pin Web Audio and media elements to the system default output.
// On Windows, Chrome can latch an AudioContext or <audio> element onto a
// secondary device (communications / headset / monitor) instead of the
// default speakers. Empty sink id is the user-agent default; 'default' is
// the enumerateDevices id for that same output. Never pass a specific device.
//
// speechSynthesis has no setSinkId — when navigator.audioSession.type is
// 'play-and-record' (chat mic ducking), Windows often routes synth TTS to
// the communications endpoint while a pinned <audio> (gTTS) stays on default.
// Call primeDefaultSpeakerBeforeSynth() before synth tiers and route companion
// playback through companionPlaybackSession() in voice-chat-focus.
//
// Also call ensureCompanionPlaybackRoute() before every HTMLAudio TTS start so
// non-Yue / male pins do not stay on the mic communications sink after gate.

import { isAppleTouchDevice } from './apple-touch';

type SinkTarget = { setSinkId?: (sinkId: string) => Promise<void>; sinkId?: string };
type AudioSessionNav = Navigator & { audioSession?: { type: string } };

/** Hard cap so resume/unlock never stacks above a comfortable level. */
export const MASTER_OUTPUT_CAP = 0.85;

/** Last sink id that successfully pinned ( '' | 'default' ). Undefined = not tried yet. */
let cachedDefaultSink: string | undefined;

/** Set while chat mic holds play-and-record — gesture TTS must pin-before-play too. */
let micCommsRoutingLatch = false;

let sharedCtx: AudioContext | null = null;
let sharedMasterGain: GainNode | null = null;

export function resetSharedAudioContextForTests(): void {
  sharedCtx = null;
  sharedMasterGain = null;
}

/** Vitest only — module-level sink cache is global across cases in one file. */
export function resetDefaultSinkCacheForTests(): void {
  cachedDefaultSink = undefined;
  micCommsRoutingLatch = false;
}

/** Mic opened play-and-record — HTMLAudio must pin default sink before play(). */
export function markMicCommsRoutingLatch(on: boolean): void {
  micCommsRoutingLatch = on;
}

export function micCommsRoutingLatchActive(): boolean {
  return micCommsRoutingLatch;
}

/**
 * Resolves gesture-safe vs pin-before-play for HTMLAudio TTS.
 * Chat beginTts sets pinSinkBeforePlay; card greet/preview omit it (gesture-safe).
 * Also pin-before-play when mic comms latch is active — unless `gestureTap` forces
 * play-first on a select-board user tap (await pin before play loses the gesture).
 */
export function htmlAudioStartMode(
  explicitPin?: boolean,
  gestureTap?: boolean,
): 'gesture-safe' | 'pin-before-play' {
  // iPhone: awaiting setSinkId before play() drops the tap window, and
  // play-and-record routing is an earpiece/Windows problem, not an iOS one.
  if (isAppleTouchDevice()) return 'gesture-safe';
  if (gestureTap) return 'gesture-safe';
  if (explicitPin || micCommsRoutingLatch) return 'pin-before-play';
  return 'gesture-safe';
}

/** Resolved default sink for tests and diagnostics. */
export function getDefaultSinkId(): string {
  return cachedDefaultSink ?? '';
}

/**
 * Force the OS audio session back to speakers before TTS.
 * Chat mic opens `play-and-record`, which on Windows routes unmarked media
 * (and synth) to the communications device — the "voice on other speakers"
 * report for non-Yue / male buttons after a Yue-female gate sample worked.
 */
export function ensureCompanionPlaybackRoute(): void {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch { /* ignore */ }
  // A tab hide (or an Android audio-focus loss) suspends the shared context and
  // nothing used to take it out again before the next TTS line. Resuming here
  // is cheap, idempotent and runs on every companion playback start.
  resumeSharedAudioOutput();
}

/**
 * Only '' or 'default' are the user-agent default speakers.
 * Never copy AudioContext.sinkId — after mic play-and-record that id can be a
 * communications / headset endpoint. Caching it (#406 preferredSinkId) routed
 * every later HTMLAudio greet onto a silent/wrong device (owner: Yue female
 * audible on default speakers; male / en / zh / ja mute on the other device).
 */
export function isDefaultSinkId(id: string): boolean {
  return id === '' || id === 'default';
}

/** Drop any non-default cache entry — only '' / 'default' may stick. */
function scrubNonDefaultSinkCache(): void {
  if (cachedDefaultSink !== undefined && !isDefaultSinkId(cachedDefaultSink)) {
    cachedDefaultSink = undefined;
  }
}

/** Cached default sink only — never a hardware device id. */
function preferredSinkId(): string {
  scrubNonDefaultSinkCache();
  if (cachedDefaultSink !== undefined && isDefaultSinkId(cachedDefaultSink)) {
    return cachedDefaultSink;
  }
  return '';
}

async function resolveDefaultSinkId(setSink: (id: string) => Promise<void>): Promise<string> {
  scrubNonDefaultSinkCache();
  if (cachedDefaultSink !== undefined && isDefaultSinkId(cachedDefaultSink)) {
    return cachedDefaultSink;
  }
  try {
    await setSink('');
    cachedDefaultSink = '';
    return '';
  } catch {
    try {
      await setSink('default');
      cachedDefaultSink = 'default';
      return 'default';
    } catch {
      cachedDefaultSink = '';
      return '';
    }
  }
}

/**
 * Await sink pin. Callers of gesture-bound HTMLAudio MUST still play() first —
 * only use this on play() reject-retry (or on non-playing helpers like synth
 * prime). Never call setSinkId from an onplay handler: Chrome interrupts live
 * TTS mid-stream (owner mute of every lang/gender except Yue female).
 */
export async function pinDefaultOutputAsync(
  node: SinkTarget | null | undefined,
): Promise<void> {
  ensureCompanionPlaybackRoute();
  scrubNonDefaultSinkCache();
  const setSink = node?.setSinkId;
  if (typeof setSink !== 'function') return;
  const bound = setSink.bind(node);
  // Element already on a communications / headset id → force default; never
  // reuse that UUID as preferredSinkId.
  const currentId = node?.sinkId;
  const current = typeof currentId === 'string' ? currentId : '';
  if (current && !isDefaultSinkId(current)) {
    cachedDefaultSink = undefined;
  }
  const preferred = preferredSinkId();
  if (cachedDefaultSink !== undefined && isDefaultSinkId(preferred)) {
    try {
      await bound(preferred);
      return;
    } catch {
      /* fall through to resolve */
      cachedDefaultSink = undefined;
    }
  }
  await resolveDefaultSinkId(bound);
}

export function pinDefaultOutput(node: SinkTarget | null | undefined): void {
  ensureCompanionPlaybackRoute();
  scrubNonDefaultSinkCache();
  const setSink = node?.setSinkId;
  if (typeof setSink !== 'function') return;
  void pinDefaultOutputAsync(node).catch(() => {
    void setSink.call(node, '').catch(() => {
      void setSink.call(node, 'default').catch(() => undefined);
    });
  });
}

/** Shared master gain (0 … MASTER_OUTPUT_CAP) — connect WebAudio sinks here when practical. */
export function getSharedMasterGain(): GainNode | null {
  createDefaultAudioContext();
  return sharedMasterGain;
}

export function suspendSharedAudioOutput(): void {
  if (!sharedCtx || sharedCtx.state === 'closed') return;
  try {
    void sharedCtx.suspend();
  } catch { /* ignore */ }
}

export function resumeSharedAudioOutput(): void {
  if (!sharedCtx || sharedCtx.state === 'closed') return;
  try {
    void sharedCtx.resume();
  } catch { /* ignore */ }
  if (sharedMasterGain) {
    try {
      sharedMasterGain.gain.value = MASTER_OUTPUT_CAP;
    } catch { /* ignore */ }
  }
}

/** True when `ac` is the process-wide default context (must never be closed by BGM). */
export function isSharedDefaultAudioContext(ac: AudioContext | null | undefined): boolean {
  return !!ac && !!sharedCtx && ac === sharedCtx && sharedCtx.state !== 'closed';
}

/**
 * Resume + silent buffer tick so sing/dance beds can start after a chat tap
 * without importing voice.ts (music already feeds voice via duckLibraryBed).
 */
export function primeSharedAudioContext(): void {
  const ctx = createDefaultAudioContext();
  if (!ctx) return;
  resumeSharedAudioOutput();
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

/** AudioContext bound to the default speakers. Falls back if sinkId options throw. */
export function createDefaultAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedCtx && sharedCtx.state !== 'closed') {
    pinDefaultOutput(sharedCtx as unknown as SinkTarget);
    return sharedCtx;
  }
  const AC = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  let ctx: AudioContext;
  try {
    ctx = new AC({ sinkId: '' } as AudioContextOptions);
  } catch {
    ctx = new AC();
  }
  pinDefaultOutput(ctx as unknown as SinkTarget);
  sharedCtx = ctx;
  try {
    sharedMasterGain = ctx.createGain();
    sharedMasterGain.gain.value = MASTER_OUTPUT_CAP;
    sharedMasterGain.connect(ctx.destination);
  } catch {
    sharedMasterGain = null;
  }
  return sharedCtx;
}

let synthPrimeEl: HTMLAudioElement | null = null;

/**
 * Best-effort: resume default Web Audio and pin a media element before
 * speechSynthesis. Does not replace setSinkId on synth (impossible) but keeps
 * the OS playback path aligned when the session was play-and-record.
 */
export async function primeDefaultSpeakerBeforeSynth(): Promise<void> {
  if (typeof window === 'undefined') return;
  ensureCompanionPlaybackRoute();
  try {
    const ctx = createDefaultAudioContext();
    if (ctx?.state === 'suspended') await ctx.resume().catch(() => undefined);
    pinDefaultOutput(ctx as unknown as SinkTarget);
  } catch {
    /* ignore */
  }
  try {
    if (!synthPrimeEl) {
      synthPrimeEl = new Audio();
      synthPrimeEl.volume = 0.001;
      try { synthPrimeEl.dataset.amojiAudio = '1'; } catch { /* ignore */ }
    }
    await pinDefaultOutputAsync(synthPrimeEl);
    await synthPrimeEl.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Kick default-output pin without awaiting — keeps a user gesture for play(). */
function kickDefaultOutputPinBeforeGesturePlay(audio: HTMLAudioElement): void {
  if (!micCommsRoutingLatchActive()) return;
  // play() often succeeds under play-and-record while routing to earpiece /
  // BT comms — reject-only pin never runs. Fire-and-forget pin + WebAudio
  // resume in the same turn as the tap, before the first play() attempt.
  pinDefaultOutput(audio);
  try {
    const ctx = createDefaultAudioContext();
    if (ctx?.state === 'suspended') void ctx.resume();
    pinDefaultOutput(ctx as unknown as SinkTarget);
  } catch { /* ignore */ }
}

/**
 * Start an HTMLAudioElement on the default speakers.
 *
 * - `gesture-safe` (card greet / voice preview): play() first in the same turn
 *   as the tap; pin only on reject-retry. Never setSinkId in onplay (#424).
 * - `pin-before-play` (chat reply TTS after mic opened play-and-record): await
 *   the default sink pin, then play. Under play-and-record, play() often
 *   succeeds while routing to a silent communications device — reject-only pin
 *   never runs, so non-Yue / male chat lines stay mute on the default speakers.
 */
export async function startHtmlAudioOnDefaultSpeakers(
  audio: HTMLAudioElement,
  mode: 'gesture-safe' | 'pin-before-play' = 'gesture-safe',
): Promise<void> {
  ensureCompanionPlaybackRoute();
  const playOrPinRetry = async (firstErr?: unknown): Promise<void> => {
    try {
      await audio.play();
    } catch (err) {
      await pinDefaultOutputAsync(audio);
      try {
        await audio.play();
      } catch (retryErr) {
        ensureCompanionPlaybackRoute();
        await new Promise<void>((r) => { setTimeout(r, 0); });
        try {
          await audio.play();
        } catch (thirdErr) {
          throw thirdErr instanceof Error
            ? thirdErr
            : retryErr instanceof Error
              ? retryErr
              : err instanceof Error
                ? err
                : firstErr instanceof Error
                  ? firstErr
                  : new Error(String(thirdErr));
        }
      }
    }
  };
  if (mode === 'pin-before-play') {
    try {
      await pinDefaultOutputAsync(audio);
    } catch {
      /* still attempt play */
    }
    await playOrPinRetry();
    return;
  }
  kickDefaultOutputPinBeforeGesturePlay(audio);
  await playOrPinRetry();
}
