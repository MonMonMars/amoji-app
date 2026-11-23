import { describe, expect, it } from 'vitest';
import {
  LiveBeatTracker,
  OnsetTracker,
  estimateBpmFromOnsets,
  foldPeriod,
  spectralFlux,
} from '../lib/beat-detect';

/** Click times at a known BPM, first click at 0. */
function clicks(bpm: number, seconds: number): number[] {
  const period = 60 / bpm;
  const out: number[] = [];
  for (let t = 0; t <= seconds + 1e-9; t += period) out.push(Number(t.toFixed(6)));
  return out;
}

/**
 * Feed a synthetic spectrum: one broadband frame on every beat, silence
 * between. This is the analyser path, not a shortcut through the BPM helper.
 */
function feedClickSpectrum(
  tracker: LiveBeatTracker,
  bpm: number,
  seconds: number,
  frameHz = 100,
): void {
  const period = 60 / bpm;
  const frames = Math.round(seconds * frameHz);
  // Mark the frame nearest each true beat. A naive `t % period < 1 frame`
  // test aliases at fast tempos (145 BPM lands between 100 Hz frames).
  const beatFrames = new Set<number>();
  for (let b = 0; b * period <= seconds; b++) {
    beatFrames.add(Math.round((b * period) * frameHz));
  }
  const bins = new Uint8Array(64);
  for (let i = 0; i <= frames; i++) {
    bins.fill(beatFrames.has(i) ? 210 : 0);
    const t = i / frameHz;
    tracker.feedSpectrum(bins, t, t * 1000);
  }
}

describe('spectral flux + onset folding', () => {
  it('counts only positive spectral change', () => {
    const a = new Uint8Array([0, 0, 0, 0]);
    const b = new Uint8Array([255, 0, 255, 0]);
    expect(spectralFlux(a, b)).toBeCloseTo(0.5, 5);
    expect(spectralFlux(b, a)).toBe(0);
    expect(spectralFlux(null, b)).toBe(0);
  });

  it('folds subdivision / multiple periods into the 60-180 window', () => {
    expect(foldPeriod(0.5)).toBeCloseTo(0.5, 6);
    expect(foldPeriod(0.25, 60, 180)).toBeCloseTo(0.5, 6);
    expect(foldPeriod(2, 60, 180)).toBeCloseTo(1, 6);
    expect(foldPeriod(0, 60, 180)).toBeNull();
  });
});

describe('estimateBpmFromOnsets (known click tracks)', () => {
  it.each([
    [120, 2],
    [90, 2],
    [145, 3],
    [72, 2],
  ])('estimates %i BPM within %i BPM', (truth, tolerance) => {
    const est = estimateBpmFromOnsets(clicks(truth, 12));
    expect(est.bpm).not.toBeNull();
    expect(Math.abs((est.bpm ?? 0) - truth)).toBeLessThanOrEqual(tolerance);
    expect(est.confidence).toBeGreaterThan(0.9);
  });

  it('needs at least four onsets before claiming a tempo', () => {
    const est = estimateBpmFromOnsets([0, 0.5, 1]);
    expect(est.bpm).toBeNull();
    expect(est.confidence).toBe(0);
  });

  it('reports low confidence when intervals disagree completely', () => {
    const est = estimateBpmFromOnsets([0, 0.27, 0.88, 1.02, 1.91, 2.07, 3.13]);
    expect(est.bpm === null || est.confidence < 0.35).toBe(true);
  });
});

describe('OnsetTracker on a synthetic flux envelope', () => {
  it('fires once per click with a refractory window', () => {
    const tracker = new OnsetTracker();
    const period = 0.5; // 120 BPM
    const fired: number[] = [];
    for (let i = 0; i <= 1000; i++) {
      const t = i / 100;
      const phase = t % period;
      const flux = phase < 0.01 ? 0.8 : 0.001;
      if (tracker.pushFlux(flux, t)) fired.push(Number(t.toFixed(2)));
    }
    expect(fired.length).toBeGreaterThanOrEqual(18);
    for (let i = 1; i < fired.length; i++) {
      expect((fired[i] ?? 0) - (fired[i - 1] ?? 0)).toBeGreaterThanOrEqual(0.18);
    }
    const est = estimateBpmFromOnsets(fired);
    expect(Math.abs((est.bpm ?? 0) - 120)).toBeLessThanOrEqual(2);
  });
});

describe('LiveBeatTracker (spectrum -> BPM + beat pulse)', () => {
  it.each([
    [120, 2],
    [90, 2],
    [145, 3],
  ])('locks %i BPM from a synthetic analyser stream within %i BPM', (truth, tolerance) => {
    const tracker = new LiveBeatTracker();
    feedClickSpectrum(tracker, truth, 8);
    const snap = tracker.snapshot(8 * 1000);
    expect(snap.source).toBe('analyser');
    expect(snap.bpm).not.toBeNull();
    expect(Math.abs((snap.bpm ?? 0) - truth)).toBeLessThanOrEqual(tolerance);
    expect(snap.confidence).toBeGreaterThan(0.5);
    const atOnset = tracker.snapshot(snap.lastOnsetMs);
    expect(atOnset.pulse).toBeGreaterThan(0.9);
  });

  it('keeps a known tempo until the analyser locks', () => {
    const tracker = new LiveBeatTracker();
    tracker.setKnownTempo(96, 0);
    const early = tracker.snapshot(100);
    expect(early.source).toBe('known');
    expect(early.bpm).toBeCloseTo(96, 1);
    expect(early.pulse).toBeGreaterThan(0.3);
  });

  it('decays the accent between beats and exposes beat ordinals', () => {
    const tracker = new LiveBeatTracker();
    tracker.setKnownTempo(120, 0); // 500 ms period
    const on = tracker.snapshot(0);
    const mid = tracker.snapshot(250);
    const nxt = tracker.snapshot(500);
    expect(on.pulse).toBeCloseTo(1, 3);
    expect(mid.pulse).toBe(0);
    expect(nxt.beatIndex).toBe(1);
    expect(nxt.pulse).toBeCloseTo(1, 3);
  });

  it('clear() drops the clock', () => {
    const tracker = new LiveBeatTracker();
    tracker.setKnownTempo(120, 0);
    tracker.clear();
    expect(tracker.snapshot(10).bpm).toBeNull();
    expect(tracker.snapshot(10).pulse).toBe(0);
  });
});
