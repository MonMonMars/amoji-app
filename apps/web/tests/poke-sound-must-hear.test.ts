/**
 * Owner report 2026-11-26: "no poke sound now."
 *
 * A poke is a direct user action, so its reaction must always be audible. Two
 * code paths could swallow it silently, and both are pinned here:
 *
 *   1. THE PERFORMANCE-BED GATE. `speak()` drops an ordinary line while a
 *      song/dance bed is audible (owner: "don't talk while singing or music
 *      time") and only lets a `resumable` conversation line make room. A poke
 *      reaction is not resumable (it must stay a hard cut, see poke-resume),
 *      so it needs its own must-be-heard intent — otherwise a bed flag that is
 *      still set at speak() time (a bed the app believes is audible, e.g. one
 *      whose element was taken away by the OS) silences every poke.
 *   2. THE LOADING-FILLER FILTER. `performSpeak()` drops bare interjections
 *      ("呵" / "ふっ" / "Heh") because they are classified as loading fillers
 *      (Pixel: no spoken loading "um"). Some poke banks contain exactly those
 *      entries, so that poke said nothing at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { profilePokeLine } from '../lib/personality';
import { pokeLineForSpeech } from '../lib/personality-voice';
import { loadingFillerKind } from '../lib/voice-clips';
// Imported at collection time on purpose: `lib/voice` is a large module and its
// transform must not be counted against a 5 s test timeout on a loaded CI box.
import * as voice from '../lib/voice';

/** Module-level bed state the mocked music module reads. */
const bed = vi.hoisted(() => ({ audible: false, haltable: true, stops: 0 }));

vi.mock('../lib/music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/music')>();
  return {
    ...actual,
    isLibraryClipAudible: () => bed.audible,
    endPerformanceMusic: () => {
      bed.stops += 1;
      // The real module clears the flag in haltClip(). `haltable: false`
      // models the owner-visible failure: the flag stays set.
      if (bed.haltable) bed.audible = false;
    },
  };
});

const gttsCalls: Array<{ text: string; opts: Record<string, unknown>; resolve: () => void }> = [];

vi.mock('../lib/gtts', () => ({
  PITCH_BIAS_MALE: 0.64,
  PITCH_BIAS_FEMALE: 1.30,
  GTTS_PITCH_BIAS_MIN: 0.38,
  GTTS_PITCH_BIAS_MAX: 1.72,
  GTTS_YUE_MALE_PACE_FLOOR: 0.38,
  stopGtts: () => {},
  pauseGttsForTabHide: () => {},
  pauseAfterClause: () => 0,
  splitClauses: (text: string) => [text],
  splitChunks: (text: string) => [text],
  speakGtts: (text: string, opts: Record<string, unknown>) => new Promise<void>((resolve) => {
    gttsCalls.push({ text, opts, resolve });
    (opts.onPlaying as (() => void) | undefined)?.();
  }),
}));

vi.mock('../lib/edge-tts', () => ({
  pauseEdgeForTabHide: () => {},
  speakEdge: () => Promise.reject(new Error('edge blocked')),
  stopEdge: () => {},
  getTtsProxy: () => null,
  resolveEdgeVoice: () => ({ name: 'stub' }),
  edgeEndpointsDead: () => true,
  resetEdgeHealth: () => {},
}));

vi.mock('../lib/play-voice-clip', () => ({
  isVoiceClipPlaying: () => false,
  playGestureClipSync: () => {},
  playVoiceClip: () => Promise.resolve(),
  stopVoiceClip: () => {},
}));

async function flush(): Promise<void> {
  for (let i = 0; i < 24; i += 1) await Promise.resolve();
}

describe('a poke reaction is never swallowed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bed.audible = false;
    bed.haltable = true;
    bed.stops = 0;
    gttsCalls.length = 0;
  });

  afterEach(async () => {
    voice.stopSpeaking();
    vi.clearAllTimers();
    vi.useRealTimers();
    gttsCalls.length = 0;
    bed.audible = false;
  });

  it('speaks even when the performance bed flag is still set at speak() time', async () => {
    // The app believes a song bed is audible and cannot clear it (stale flag).
    bed.audible = true;
    bed.haltable = false;

    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    // Still the first thing the poke does: stop the show before the impact.
    expect(bed.stops).toBeGreaterThan(0);
    // …and the reaction line must still be spoken, never dropped by the gate.
    expect(gttsCalls.length).toBeGreaterThan(0);
    expect(loadingFillerKind(gttsCalls[gttsCalls.length - 1]!.text)).toBeNull();
  });

  it('a bed that yields is spoken over only after it is stopped', async () => {
    bed.audible = true;
    bed.haltable = true;

    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    expect(bed.stops).toBeGreaterThan(0);
    expect(bed.audible).toBe(false);
    expect(gttsCalls.length).toBeGreaterThan(0);
  });

  it('does not hand TTS a line it will drop as a loading filler', async () => {
    // a03-fumiriya's poke bank has a bare "Heh" at this index — an interjection
    // performSpeak() classifies as a loading filler and therefore says nothing
    // for (it settles before it even logs the attempt). Prove the case is real,
    // then prove the poke steps past it to a line TTS actually speaks.
    const raw = pokeLineForSpeech(profilePokeLine('a03-fumiriya', 'en', 1, 'torso'), 'en');
    expect(loadingFillerKind(raw.split(/[.!?。！？\n]/)[0]!.trim())).not.toBeNull();

    // The tier chain differs by gender (male pins try the device voice first),
    // so assert on the single choke point instead: performSpeak logged an
    // attempt, which a filler line never reaches.
    const attempts: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => { attempts.push(args.map(String).join(' ')); };
    try {
      voice.playPokeBurst('a03-fumiriya', 'en', 'torso', 1);
      await flush();
    } finally {
      console.log = original;
    }
    expect(attempts.some((line) => line.includes('speak attempt'))).toBe(true);
    for (const call of gttsCalls) {
      expect(loadingFillerKind(call.text), `"${call.text}"`).toBeNull();
    }
  });

  it('the reaction is a hard cut, so it is never captured as a conversation', async () => {
    voice.playPokeBurst('a01-shino', 'en', 'torso', 0);
    await flush();
    expect(gttsCalls.length).toBeGreaterThan(0);
    expect(voice.pendingPokeResume()).toBeNull();
  });
});
