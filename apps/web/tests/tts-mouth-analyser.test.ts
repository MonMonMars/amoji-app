/**
 * E2 defect 2 — the TTS mouth follows the real audio when it can be tapped,
 * and falls back to the syllable clock when it cannot (OS voice, cross-origin
 * gTTS URL, a suspended AudioContext, or a dead tap).
 *
 * Node has no Web Audio, so the tap itself cannot run here; these tests pin the
 * decisions that guard it plus the envelope smoothing that keeps the jaw from
 * jittering frame to frame.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSpeechLevel,
  feedSpeechLevel,
  isAnalysableSpeechSource,
  noteSpeechStarted,
  sampleSpeech,
} from '../lib/speech';
import { readVocalFrame, smoothMouth, visemeWeights } from '../lib/vocal-envelope';

describe('isAnalysableSpeechSource', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts blob: (Edge / proxy / OpenAI mp3) and same-origin assets', () => {
    vi.stubGlobal('location', {
      href: 'https://monmonmars.github.io/amoji-app/',
      origin: 'https://monmonmars.github.io',
    });
    expect(isAnalysableSpeechSource('blob:https://monmonmars.github.io/123')).toBe(true);
    expect(isAnalysableSpeechSource('data:audio/mpeg;base64,AAAA')).toBe(true);
    expect(isAnalysableSpeechSource('/cast/thumbs/x.jpg')).toBe(true);
    expect(isAnalysableSpeechSource('https://monmonmars.github.io/amoji-app/a.mp3')).toBe(true);
  });

  it('refuses the cross-origin gTTS URL (tapping it would silence the line)', () => {
    vi.stubGlobal('location', {
      href: 'https://monmonmars.github.io/amoji-app/',
      origin: 'https://monmonmars.github.io',
    });
    expect(isAnalysableSpeechSource(
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=yue&q=hi',
    )).toBe(false);
    expect(isAnalysableSpeechSource('https://example.com/a.mp3')).toBe(false);
    expect(isAnalysableSpeechSource('')).toBe(false);
    expect(isAnalysableSpeechSource(undefined)).toBe(false);
  });
});

describe('smoothMouth', () => {
  it('opens faster than it closes (attack shorter than release)', () => {
    const attack = smoothMouth(0, 1, 60);
    const release = smoothMouth(1, 0, 60);
    expect(attack).toBeGreaterThan(0.5);
    expect(attack).toBeLessThan(1);
    expect(1 - release).toBeLessThan(attack); // closing moved less than opening
  });

  it('damps a raw frame-to-frame jump instead of following it', () => {
    const smoothed = smoothMouth(0.1, 0.9, 16);
    expect(smoothed).toBeGreaterThan(0.1);
    expect(smoothed).toBeLessThan(0.9);
  });

  it('is monotone and ends on the target', () => {
    let v = 0;
    for (let i = 0; i < 40; i++) {
      const next = smoothMouth(v, 0.7, 60);
      expect(next).toBeGreaterThanOrEqual(v);
      v = next;
    }
    expect(v).toBeCloseTo(0.7, 3);
  });
});

describe('analyser feed vs the syllable clock', () => {
  it('prefers the live level and hands back to the clock when cleared', () => {
    const t0 = 5_000_000;
    noteSpeechStarted('hello there, how are you', t0);
    // The text clock is running on its own.
    const clock = sampleSpeech(t0 + 220);
    expect(clock).not.toBeNull();
    // One analyser frame (stubbed like the real read path) wins.
    const stub = {
      getFloatTimeDomainData: (buf: Float32Array) => buf.fill(0.3),
      getByteFrequencyData: () => undefined,
    };
    const frame = readVocalFrame(stub, new Float32Array(64), new Uint8Array(64));
    expect(frame.mouth).toBeGreaterThan(0.5);
    feedSpeechLevel(frame.mouth, frame.vowel, 500, t0 + 220);
    expect(sampleSpeech(t0 + 260)?.mouth).toBeCloseTo(frame.mouth, 5);
    // Cleared (audio ended / analyser unavailable) → the clock is back.
    clearSpeechLevel();
    expect(sampleSpeech(t0 + 260)?.mouth).not.toBeCloseTo(frame.mouth, 5);
  });

  it('the viseme weights keep the jaw on amplitude', () => {
    const w = visemeWeights(0.6, 'ih');
    expect(w.aa).toBeGreaterThan(0);
    expect(w.ih).toBeGreaterThan(w.aa); // vowel tints, jaw still present
  });
});
