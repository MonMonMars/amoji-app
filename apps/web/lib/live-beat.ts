'use client';
// Browser-side beat clock. lib/music.ts attaches an AnalyserNode for the bed
// that is actually audible; CompanionCanvas reads `liveBeatSnapshot()` each
// frame for tempo-scaled dance playback and the on-beat accent.
//
// Honest scope: an onset histogram is an ESTIMATE. On a phone stream it can
// be a few BPM off, and a track with no percussive attack may never lock.
// Callers must gate on `confidence` before claiming beat sync.

import { LiveBeatTracker, type BeatSnapshot } from './beat-detect';

let tracker = new LiveBeatTracker();
let analyser: AnalyserNode | null = null;
let bins: Uint8Array<ArrayBuffer> = new Uint8Array(0);
let timer: ReturnType<typeof setInterval> | null = null;
let startedMs = 0;

/** ~83 Hz. 12 ms frame spacing keeps BPM quantisation under ~3 BPM at 120. */
const FRAME_MS = 12;

export function attachLiveAnalyser(node: AnalyserNode): void {
  detachLiveAnalyser();
  analyser = node;
  try {
    bins = new Uint8Array(node.frequencyBinCount);
  } catch {
    bins = new Uint8Array(0);
  }
  tracker.clear();
  startedMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!bins.length) return;
  timer = setInterval(() => {
    if (!analyser) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      analyser.getByteFrequencyData(bins);
    } catch {
      return;
    }
    tracker.feedSpectrum(bins, (now - startedMs) / 1000, now);
  }, FRAME_MS);
}

export function detachLiveAnalyser(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  analyser = null;
  bins = new Uint8Array(0);
  // Drop the old bed's tempo too: a new CORS-blocked stream must not inherit
  // an analyser lock (and refuse the known-tempo fallback) from the old song.
  tracker.clear();
}

/** A tempo we know without analysis (procedural band / measured clip BPM). */
export function setKnownTempo(bpm: number, anchorMs?: number): void {
  tracker.setKnownTempo(
    bpm,
    anchorMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  );
}

export function liveBeatSnapshot(nowMs?: number): BeatSnapshot {
  return tracker.snapshot(
    nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  );
}

/** Latest visual accent, 0..1. Cheaper than a full snapshot at call sites. */
export function liveBeatPulse(nowMs?: number): number {
  return liveBeatSnapshot(nowMs).pulse;
}

/** @internal tests / teardown */
export function resetLiveBeatForTests(): void {
  detachLiveAnalyser();
  tracker = new LiveBeatTracker();
  startedMs = 0;
}
