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

type SinkTarget = { setSinkId?: (sinkId: string) => Promise<void> };

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

async function resolveDefaultSinkId(setSink: (id: string) => Promise<void>): Promise<string> {
  if (cachedDefaultSink !== undefined) return cachedDefaultSink;
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

/** Await sink pin before play() — avoids racing default routing on Windows. */
export async function pinDefaultOutputAsync(
  node: SinkTarget | null | undefined,
): Promise<void> {
  const setSink = node?.setSinkId;
  if (typeof setSink !== 'function') return;
  const bound = setSink.bind(node);
  if (cachedDefaultSink !== undefined) {
    try {
      await bound(cachedDefaultSink);
    } catch {
      /* best-effort */
    }
    return;
  }
  await resolveDefaultSinkId(bound);
}

export function pinDefaultOutput(node: SinkTarget | null | undefined): void {
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
  try {
    const ctx = createDefaultAudioContext();
    if (ctx?.state === 'suspended') await ctx.resume().catch(() => undefined);
  } catch {
    /* ignore */
  }
  try {
    if (!synthPrimeEl) {
      synthPrimeEl = new Audio();
      synthPrimeEl.volume = 0.001;
    }
    await pinDefaultOutputAsync(synthPrimeEl);
    await synthPrimeEl.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}
