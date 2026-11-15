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
//
// Owner clarification: Yue female on expected speakers + other lang/gender on
// another device is NOT mute — wrong setSinkId / communications latch.

type SinkTarget = { setSinkId?: (sinkId: string) => Promise<void>; sinkId?: string };
type AudioSessionNav = Navigator & { audioSession?: { type: string } };

/** Hard cap so resume/unlock never stacks above a comfortable level. */
export const MASTER_OUTPUT_CAP = 0.85;

/** Last sink id that successfully pinned ( '' | 'default' ). Undefined = not tried yet. */
let cachedDefaultSink: string | undefined;

let sharedCtx: AudioContext | null = null;
let sharedMasterGain: GainNode | null = null;

export function resetSharedAudioContextForTests(): void {
  sharedCtx = null;
  sharedMasterGain = null;
}

/** Vitest only — module-level sink cache is global across cases in one file. */
export function resetDefaultSinkCacheForTests(): void {
  cachedDefaultSink = undefined;
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
}

/**
 * Only '' or 'default' are the user-agent default speakers.
 * Never copy AudioContext.sinkId — after mic play-and-record that id can be a
 * communications / headset endpoint. Caching it (#406 preferredSinkId) routed
 * every later HTMLAudio greet onto a silent/wrong device.
 */
function isDefaultSinkId(id: string): boolean {
  return id === '' || id === 'default';
}

/** Drop any non-default cache entry (defensive — only '' / 'default' may stick). */
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

/**
 * Pin only to '' or 'default'. Never pass node.sinkId / AudioContext.sinkId —
 * those can be communications UUIDs after mic play-and-record (owner: Yue
 * female on default speakers, other lang/gender TTS on another device).
 */
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

/** Await sink pin — callers should still play() first on gesture-bound media. */
export async function pinDefaultOutputAsync(
  node: SinkTarget | null | undefined,
): Promise<void> {
  ensureCompanionPlaybackRoute();
  scrubNonDefaultSinkCache();
  const setSink = node?.setSinkId;
  if (typeof setSink !== 'function') return;
  const bound = setSink.bind(node);
  // If the element already latched onto a communications / headset id, force
  // default speakers. Never reuse that id as preferredSinkId.
  const current = typeof node.sinkId === 'string' ? node.sinkId : '';
  if (current && !isDefaultSinkId(current)) {
    cachedDefaultSink = undefined;
  }
  const preferred = preferredSinkId();
  if (!isDefaultSinkId(preferred)) {
    cachedDefaultSink = undefined;
  }
  if (cachedDefaultSink !== undefined && isDefaultSinkId(cachedDefaultSink)) {
    try {
      await bound(cachedDefaultSink);
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
