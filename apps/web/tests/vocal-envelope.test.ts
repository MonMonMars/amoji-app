import { describe, expect, it } from 'vitest';
import {
  mouthFromRms,
  readAnalyserRms,
  readVocalFrame,
  rmsFromFloat,
  visemeWeights,
  vowelFromSpectrum,
} from '../lib/vocal-envelope';
import { feedSpeechLevel, sampleSpeech } from '../lib/speech';

/** Stub analyser: time-domain RMS + optional spectral balance. */
function stubAnalyser(amplitude: number, spectrum?: number[]): {
  getFloatTimeDomainData: (data: Float32Array<ArrayBuffer>) => void;
  getByteFrequencyData: (data: Uint8Array<ArrayBuffer>) => void;
} {
  return {
    getFloatTimeDomainData(data: Float32Array) {
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin((i / data.length) * Math.PI * 4) * amplitude;
      }
    },
    getByteFrequencyData(data: Uint8Array) {
      for (let i = 0; i < data.length; i++) data[i] = spectrum?.[i] ?? 0;
    },
  };
}

describe('vocal envelope -> mouth', () => {
  it('maps silence to a closed mouth and a loud frame to an open one', () => {
    expect(mouthFromRms(0)).toBe(0);
    expect(mouthFromRms(0.005)).toBe(0);
    expect(mouthFromRms(0.2)).toBeGreaterThan(0.5);
    expect(mouthFromRms(10)).toBe(1);
  });

  it('reads a stubbed analyser: quiet -> 0, loud -> > 0.5', () => {
    const quiet = new Float32Array(64);
    expect(readAnalyserRms(stubAnalyser(0), quiet)).toBe(0);

    const loud = new Float32Array(64);
    const rms = readAnalyserRms(stubAnalyser(0.4), loud);
    expect(rms).toBeGreaterThan(0.1);
    expect(mouthFromRms(rms)).toBeGreaterThan(0.5);
  });

  it('amplitude 0 -> every VRM mouth preset 0; loud -> aa dominant', () => {
    const closed = visemeWeights(0, 'aa');
    expect(closed.aa).toBe(0);
    expect(closed.ih + closed.ou + closed.ee + closed.oh).toBe(0);

    const open = visemeWeights(1, 'aa');
    expect(open.aa).toBe(1);

    const bright = visemeWeights(0.9, 'ee');
    expect(bright.aa).toBeGreaterThan(0.3);
    expect(bright.ee).toBeGreaterThan(0.7);
  });

  it('picks a vowel from the spectral balance without closing the jaw', () => {
    const low = new Uint8Array(64);
    for (let i = 1; i < 9; i++) low[i] = 200;
    expect(vowelFromSpectrum(low)).toBe('ou');

    const bright = new Uint8Array(64);
    for (let i = 25; i < 64; i++) bright[i] = 200;
    expect(vowelFromSpectrum(bright)).toBe('ee');

    const mid = new Uint8Array(64);
    for (let i = 9; i < 25; i++) mid[i] = 200;
    expect(vowelFromSpectrum(mid)).toBe('ih');
  });

  it('a stubbed analyser frame reaches the shared speech visemes', () => {
    const now = 10_000;
    const quietFrame = readVocalFrame(stubAnalyser(0), new Float32Array(64), new Uint8Array(64));
    feedSpeechLevel(quietFrame.mouth, quietFrame.vowel, 200, now);
    const quiet = sampleSpeech(now);
    expect(quiet?.mouth ?? 0).toBe(0);

    const loudFrame = readVocalFrame(stubAnalyser(0.4), new Float32Array(64), new Uint8Array(64));
    feedSpeechLevel(loudFrame.mouth, loudFrame.vowel, 200, now + 1);
    const loud = sampleSpeech(now + 1);
    expect(loud).not.toBeNull();
    expect(loud!.mouth).toBeGreaterThan(0.5);
    expect(visemeWeights(loud!.mouth, loud!.vowel).aa).toBeGreaterThan(0.3);
  });

  it('rmsFromFloat handles an empty frame', () => {
    expect(rmsFromFloat(new Float32Array(0))).toBe(0);
  });
});
