// Live onset / tempo estimation for dance + sing beds.
// Pure math only: no DOM, no WebAudio, no timers. CompanionCanvas and
// lib/live-beat.ts own the analyser + clock; this file stays unit-testable
// against synthetic click trains.
//
// Method (deliberately simple and honest):
//  1. spectral flux between consecutive FFT frames (positive change only)
//  2. onset = flux spike above a rolling mean + refractory window
//  3. inter-onset intervals are folded into 60-180 BPM and histogrammed
//  4. the winning histogram bin becomes the tempo; a phase-locked anchor
//     follows the most recent onset so accents land on the beat.
// A phone browser stream is noisy: this is an estimate, not frame-accurate
// sync. We never claim sample-accurate alignment.

export interface TempoEstimate {
  /** Estimated beats per minute, or null when the onsets do not agree. */
  bpm: number | null;
  /** 0..1 share of folded intervals that landed in the winning bin. */
  confidence: number;
  /** Folded beat period in seconds (60 / bpm). */
  periodSec: number | null;
}

export interface OnsetTrackerOptions {
  /** Seconds of flux kept for the rolling mean. */
  historySec?: number;
  /** Flux must exceed `mean + threshold * std` to fire. */
  threshold?: number;
  /** Ignore a second onset within this many seconds. */
  minGapSec?: number;
  /** Absolute flux floor (normalized 0..1 spectrum). */
  absoluteFloor?: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Normalized spectral flux between two byte-frequency frames (0..1). */
export function spectralFlux(
  prev: Uint8Array | null | undefined,
  cur: Uint8Array,
): number {
  if (!prev || prev.length !== cur.length || !cur.length) return 0;
  let sum = 0;
  for (let i = 0; i < cur.length; i++) {
    const c = (cur[i] ?? 0) / 255;
    const p = (prev[i] ?? 0) / 255;
    const d = c - p;
    if (d > 0) sum += d;
  }
  return sum / cur.length;
}

/** Fold any inter-onset interval into the configured beat-period window. */
export function foldPeriod(
  periodSec: number,
  minBpm = 60,
  maxBpm = 180,
): number | null {
  if (!Number.isFinite(periodSec) || periodSec <= 0) return null;
  const minP = 60 / maxBpm;
  const maxP = 60 / minBpm;
  let p = periodSec;
  // Guard against pathological / zero-ish intervals.
  if (p < minP * 0.25 || p > maxP * 4) return null;
  while (p > maxP) p /= 2;
  while (p < minP) p *= 2;
  return p;
}

/**
 * Estimate BPM from onset timestamps (seconds). Intervals are folded into
 * 60-180 BPM and collected in 10 ms bins; a triangular 3-bin smoothing keeps
 * a jittery phone clock from splitting one tempo across neighbours.
 */
export function estimateBpmFromOnsets(
  onsetTimes: readonly number[],
  opts?: { minBpm?: number; maxBpm?: number; binSec?: number },
): TempoEstimate {
  const minBpm = opts?.minBpm ?? 60;
  const maxBpm = opts?.maxBpm ?? 180;
  const binSec = opts?.binSec ?? 0.01;
  const minP = 60 / maxBpm;
  const maxP = 60 / minBpm;
  const bins = Math.max(1, Math.ceil((maxP - minP) / binSec) + 1);
  const hist = new Float64Array(bins);
  let folded = 0;

  for (let i = 1; i < onsetTimes.length; i++) {
    const dt = (onsetTimes[i] ?? 0) - (onsetTimes[i - 1] ?? 0);
    const p = foldPeriod(dt, minBpm, maxBpm);
    if (p == null) continue;
    const idx = clamp(Math.round((p - minP) / binSec), 0, bins - 1);
    hist[idx] = (hist[idx] ?? 0) + 1;
    folded += 1;
  }
  if (!folded || folded < 3) return { bpm: null, confidence: 0, periodSec: null };

  // Triangular smoothing: peak bin + half of each neighbour.
  const smooth = new Float64Array(bins);
  for (let i = 0; i < bins; i++) {
    const l = i > 0 ? (hist[i - 1] ?? 0) * 0.5 : 0;
    const r = i + 1 < bins ? (hist[i + 1] ?? 0) * 0.5 : 0;
    smooth[i] = (hist[i] ?? 0) + l + r;
  }
  let best = 0;
  for (let i = 1; i < bins; i++) {
    if ((smooth[i] ?? 0) > (smooth[best] ?? 0)) best = i;
  }
  const mass = smooth[best] ?? 0;
  if (mass <= 0) return { bpm: null, confidence: 0, periodSec: null };
  const periodSec = clamp(minP + best * binSec, minP, maxP);
  // Raw peak share of the folded intervals. Pure click train -> 1.0;
  // scattered intervals stay low even when smoothing picks a winner.
  const confidence = clamp((hist[best] ?? 0) / folded, 0, 1);
  const bpm = 60 / periodSec;
  if (!Number.isFinite(bpm)) return { bpm: null, confidence: 0, periodSec: null };
  return {
    bpm: Math.round(bpm * 10) / 10,
    confidence: Math.round(confidence * 1000) / 1000,
    periodSec,
  };
}

/**
 * Streaming onset detector: feed one spectral-flux value per analyser frame.
 * `pushFlux` returns true on the frame the onset is detected.
 */
export class OnsetTracker {
  private readonly historySec: number;
  private readonly threshold: number;
  private readonly minGapSec: number;
  private readonly absoluteFloor: number;
  private readonly fluxHistory: { t: number; v: number }[] = [];
  private readonly onsets: number[] = [];
  private lastOnsetSec = -Infinity;

  constructor(opts?: OnsetTrackerOptions) {
    this.historySec = opts?.historySec ?? 1.1;
    this.threshold = opts?.threshold ?? 1.15;
    this.minGapSec = opts?.minGapSec ?? 0.18;
    this.absoluteFloor = opts?.absoluteFloor ?? 0.0035;
  }

  pushFlux(flux: number, tSec: number): boolean {
    if (!Number.isFinite(flux) || !Number.isFinite(tSec)) return false;
    const t = Math.max(0, tSec);
    const h = this.fluxHistory;
    h.push({ t, v: flux });
    while (h.length && t - (h[0]?.t ?? t) > this.historySec) h.shift();

    let sum = 0;
    let sumSq = 0;
    for (const row of h) {
      sum += row.v;
      sumSq += row.v * row.v;
    }
    const n = h.length || 1;
    const mean = sum / n;
    const variance = Math.max(0, sumSq / n - mean * mean);
    const std = Math.sqrt(variance);
    const threshold = mean + this.threshold * std;
    const isOnset =
      flux >= this.absoluteFloor
      && flux > threshold
      && t - this.lastOnsetSec >= this.minGapSec;
    if (isOnset) {
      this.lastOnsetSec = t;
      this.onsets.push(t);
      const keepFrom = t - 8;
      while (this.onsets.length && (this.onsets[0] ?? t) < keepFrom) this.onsets.shift();
    }
    return isOnset;
  }

  /** Recent onset timestamps (seconds), capped to the last 8 s. */
  onsetTimes(): readonly number[] {
    return this.onsets;
  }

  reset(): void {
    this.fluxHistory.length = 0;
    this.onsets.length = 0;
    this.lastOnsetSec = -Infinity;
  }
}

export type BeatSource = 'analyser' | 'known' | 'none';

export interface BeatSnapshot {
  bpm: number | null;
  confidence: number;
  periodMs: number | null;
  /** 0..1 position inside the current beat. */
  phase: number;
  /** Beat ordinal since the anchor; -1 when no clock is running. */
  beatIndex: number;
  /** 0..1 accent envelope: 1 on a beat/onset, decaying fast. */
  pulse: number;
  source: BeatSource;
  lastOnsetMs: number;
}

export interface LiveBeatOptions {
  minBpm?: number;
  maxBpm?: number;
  /** How much of a beat the visual accent lasts (0.15..0.5). */
  accentFrac?: number;
  /** Minimum confidence before an analyser tempo replaces a known tempo. */
  lockConfidence?: number;
}

/**
 * Small state machine behind lib/live-beat.ts. Kept DOM-free so a synthetic
 * spectrum can drive it in tests.
 */
export class LiveBeatTracker {
  private readonly onset: OnsetTracker;
  private readonly minBpm: number;
  private readonly maxBpm: number;
  private readonly accentFrac: number;
  private readonly lockConfidence: number;

  private prevBins: Uint8Array | null = null;
  private anchorMs = 0;
  private periodMs: number | null = null;
  private confidence = 0;
  private source: BeatSource = 'none';
  private lastOnsetMs = -1;
  private lastEstimateAtSec = -Infinity;

  constructor(opts?: LiveBeatOptions) {
    this.minBpm = opts?.minBpm ?? 60;
    this.maxBpm = opts?.maxBpm ?? 180;
    this.accentFrac = opts?.accentFrac ?? 0.28;
    this.lockConfidence = opts?.lockConfidence ?? 0.35;
    this.onset = new OnsetTracker();
  }

  /** Feed one frequency-domain frame. Returns true when an onset fired. */
  feedSpectrum(bins: Uint8Array, tSec: number, nowMs = tSec * 1000): boolean {
    const flux = spectralFlux(this.prevBins, bins);
    this.prevBins = new Uint8Array(bins);
    const onset = this.onset.pushFlux(flux, tSec);
    if (!onset) return false;

    this.lastOnsetMs = nowMs;
    // Re-estimate at most every 120 ms so a dense passage cannot thrash.
    if (tSec - this.lastEstimateAtSec >= 0.12) {
      this.lastEstimateAtSec = tSec;
      const est = estimateBpmFromOnsets(this.onset.onsetTimes(), {
        minBpm: this.minBpm,
        maxBpm: this.maxBpm,
      });
      if (est.bpm && est.confidence >= this.lockConfidence) {
        const nextPeriod = 60_000 / est.bpm;
        const hadClock = this.periodMs != null && this.source === 'analyser';
        this.periodMs = hadClock && this.periodMs != null
          ? this.periodMs * 0.7 + nextPeriod * 0.3
          : nextPeriod;
        this.confidence = Math.max(this.confidence * 0.6, est.confidence);
        this.source = 'analyser';
        // Phase-lock: nudge the anchor toward this onset instead of snapping
        // every time (a hard snap makes the visual pulse stutter).
        const predicted = this.anchorMs + Math.round((nowMs - this.anchorMs) / this.periodMs) * this.periodMs;
        const offset = nowMs - predicted;
        if (!hadClock || Math.abs(offset) > this.periodMs * 0.35) {
          this.anchorMs = nowMs;
        } else {
          this.anchorMs += offset * 0.35;
        }
      }
    }
    return true;
  }

  /**
   * A tempo we already know (procedural band, authored/measured clip BPM).
   * Used until an analyser locks a confident tempo.
   */
  setKnownTempo(bpm: number, anchorMs: number): void {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    if (this.source === 'analyser' && this.confidence >= 0.5) return;
    this.periodMs = 60_000 / clamp(bpm, this.minBpm, this.maxBpm);
    this.confidence = Math.max(this.confidence, 0.35);
    this.source = 'known';
    this.anchorMs = anchorMs;
  }

  snapshot(nowMs: number): BeatSnapshot {
    const period = this.periodMs;
    if (!period || !Number.isFinite(period) || period <= 0) {
      return {
        bpm: null,
        confidence: 0,
        periodMs: null,
        phase: 0,
        beatIndex: -1,
        pulse: 0,
        source: this.source,
        lastOnsetMs: this.lastOnsetMs,
      };
    }
    const elapsed = nowMs - this.anchorMs;
    const beatIndex = elapsed >= 0 ? Math.floor(elapsed / period) : -1;
    const phase = elapsed >= 0 ? (elapsed % period) / period : 0;
    const decay = Math.max(0.08, Math.min(0.5, this.accentFrac));
    let pulse = phase < decay ? 1 - phase / decay : 0;
    // A detected onset between predicted beats still gets a visible accent.
    if (this.lastOnsetMs >= 0) {
      const since = nowMs - this.lastOnsetMs;
      if (since >= 0 && since < 220) pulse = Math.max(pulse, 1 - since / 220);
    }
    return {
      bpm: Math.round((60_000 / period) * 10) / 10,
      confidence: this.confidence,
      periodMs: period,
      phase,
      beatIndex,
      pulse,
      source: this.source,
      lastOnsetMs: this.lastOnsetMs,
    };
  }

  clear(): void {
    this.prevBins = null;
    this.anchorMs = 0;
    this.periodMs = null;
    this.confidence = 0;
    this.source = 'none';
    this.lastOnsetMs = -1;
    this.lastEstimateAtSec = -Infinity;
    this.onset.reset();
  }
}
