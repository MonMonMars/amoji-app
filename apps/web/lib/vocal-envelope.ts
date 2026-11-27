// WebAudio envelope -> VRM mouth presets. Pure helpers so tests can feed a
// stubbed AnalyserNode without a browser.
//
// The old song mouth cycled the five vowels on a wall clock and gave the
// matching preset full amplitude only 1/5 of the time, so the lips looked
// nearly shut while a loud vocal played. Now the jaw (`aa`) always follows
// the measured amplitude; the spectral vowel only shapes the rest.

import type { VisemeVowel } from './speech';

export type MouthWeights = Record<VisemeVowel, number>;

export interface AnalyserLike {
  // Match the DOM AnalyserNode signatures (TS 5.7 typed-array buffers).
  getFloatTimeDomainData?: (data: Float32Array<ArrayBuffer>) => void;
  getByteFrequencyData?: (data: Uint8Array<ArrayBuffer>) => void;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** RMS of a time-domain frame (0..1 for normalized float audio). */
export function rmsFromFloat(data: Float32Array): number {
  if (!data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const s = data[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Map RMS to jaw openness. The floor removes room tone; the gain makes a
 * normal vocal reach a visibly open mouth without pinning at 1.0.
 */
export function mouthFromRms(rms: number, floor = 0.012, gain = 7): number {
  if (!Number.isFinite(rms) || rms <= floor) return 0;
  return clamp01((rms - floor) * gain);
}

/**
 * One-pole attack/release smoothing for a mouth envelope. Raw RMS jitters
 * frame to frame (especially on a phone speaker), so the jaw opens quickly
 * (~45 ms) but closes more slowly (~110 ms) — a natural syllable shape, not a
 * flicker. `dtMs` is the time since the previous sample.
 */
export function smoothMouth(
  prev: number,
  target: number,
  dtMs: number,
  attackMs = 45,
  releaseMs = 110,
): number {
  const p = clamp01(Number.isFinite(prev) ? prev : 0);
  const t = clamp01(Number.isFinite(target) ? target : 0);
  const tc = t > p ? attackMs : releaseMs;
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  const alpha = 1 - Math.exp(-dt / Math.max(1, tc));
  return clamp01(p + (t - p) * alpha);
}

/** Read one analyser frame; returns zero when the analyser is unavailable. */
export function readAnalyserRms(an: AnalyserLike | null, buf: Float32Array<ArrayBuffer>): number {
  if (!an || typeof an.getFloatTimeDomainData !== 'function') return 0;
  try {
    an.getFloatTimeDomainData(buf);
  } catch {
    return 0;
  }
  return rmsFromFloat(buf);
}

/**
 * Pick a vowel shape from the spectral balance. Only a cosmetic nuance:
 * `aa` (jaw) is always driven by amplitude, so a wrong pick still reads as
 * singing rather than as a closed mouth.
 */
export function vowelFromSpectrum(bins: Uint8Array): VisemeVowel {
  if (!bins.length) return 'aa';
  let low = 0;
  let mid = 0;
  let high = 0;
  let lowN = 0;
  let midN = 0;
  let highN = 0;
  const n = bins.length;
  const midStart = Math.min(n, 9);
  const highStart = Math.min(n, 25);
  for (let i = 1; i < n; i++) {
    const v = bins[i] ?? 0;
    if (i < midStart) {
      low += v;
      lowN++;
    } else if (i < highStart) {
      mid += v;
      midN++;
    } else {
      high += v;
      highN++;
    }
  }
  const l = lowN ? low / lowN : 0;
  const m = midN ? mid / midN : 0;
  const h = highN ? high / highN : 0;
  if (l + m + h < 6) return 'aa';
  if (h > l * 1.35 && h >= m * 0.9) return 'ee';
  if (m > l * 1.2 && m > h * 1.1) return 'ih';
  if (l > m * 1.5 && l > h * 1.4) return 'ou';
  if (l > m * 1.05 && l > h * 0.9) return 'oh';
  return 'aa';
}

/**
 * Five VRM preset weights for one mouth frame. `aa` is the jaw and always
 * carries most of the amplitude; the vowel preset gets a smaller share.
 */
export function visemeWeights(mouth: number, vowel: VisemeVowel): MouthWeights {
  const m = clamp01(mouth);
  const rest = m * 0.05;
  const out: MouthWeights = { aa: 0, ih: rest, ou: rest, ee: rest, oh: rest };
  switch (vowel) {
    case 'aa':
      out.aa = m;
      break;
    case 'ih':
    case 'ee':
      out.aa = m * 0.38;
      out[vowel] = m * 0.82;
      break;
    case 'oh':
    case 'ou':
      out.aa = m * 0.55;
      out[vowel] = m * 0.78;
      break;
    default:
      out.aa = m;
      break;
  }
  return out;
}

export interface VocalFrame {
  rms: number;
  mouth: number;
  vowel: VisemeVowel;
}

/** One analyser read -> amplitude + vowel shape for the mouth. */
export function readVocalFrame(
  an: AnalyserLike | null,
  timeData: Float32Array<ArrayBuffer>,
  freqData: Uint8Array<ArrayBuffer>,
): VocalFrame {
  const rms = readAnalyserRms(an, timeData);
  let vowel: VisemeVowel = 'aa';
  if (an && typeof an.getByteFrequencyData === 'function') {
    try {
      an.getByteFrequencyData(freqData);
      vowel = vowelFromSpectrum(freqData);
    } catch {
      vowel = 'aa';
    }
  }
  return { rms, mouth: mouthFromRms(rms), vowel };
}
