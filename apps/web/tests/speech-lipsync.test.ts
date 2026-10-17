import { describe, expect, it } from 'vitest';
import {
  finishLipSync, followAudioElement, holdLipSync, noteSpeechStarted, notifySpeaking, sampleSpeech, speechDurationMs, syncLipToAudio,
} from '../lib/speech';

describe('lip sync covers the whole sentence', () => {
  it('counts every CJK syllable, not one flap for the line', () => {
    const line = '哈哈，你戳到我的頭，仲想玩嗎？';
    const dur = speechDurationMs(line);
    expect(dur).toBeGreaterThan(170 * 6);
    expect(dur).toBeGreaterThan(speechDurationMs('哈'));
    const t0 = 1_000_000;
    notifySpeaking(line, t0);
    expect(sampleSpeech(t0 + 80)?.mouth ?? 0).toBeGreaterThan(0);
    expect(sampleSpeech(t0 + Math.floor(dur / 2))?.mouth ?? 0).toBeGreaterThan(0.1);
    expect(sampleSpeech(t0 + dur - 400)?.mouth ?? 0).toBeGreaterThan(0.05);
    expect(sampleSpeech(t0 + dur + 80)).toBeNull();
  });

  it('follows a longer audio file through the last word, then stops', () => {
    const t0 = 2_000_000;
    const id = noteSpeechStarted('哈', t0);
    expect(speechDurationMs('哈')).toBeLessThan(2000);
    syncLipToAudio(id, 6.4, 0.2, t0 + 200);
    expect(sampleSpeech(t0 + 200 + 4000)?.mouth ?? 0).toBeGreaterThan(0.05);
    finishLipSync(id, t0 + 200 + 6200, 100);
    expect(sampleSpeech(t0 + 200 + 6400)).toBeNull();
  });

  it('keeps the mouth open across chunks and ignores a stale finish', () => {
    const t0 = 3_000_000;
    const first = noteSpeechStarted('Ha', t0);
    const clock = {
      duration: Number.NaN,
      currentTime: 0,
      listeners: new Map<string, Array<() => void>>(),
      addEventListener(type: string, listener: () => void) {
        const list = this.listeners.get(type) ?? [];
        list.push(listener);
        this.listeners.set(type, list);
      },
    };
    followAudioElement(clock, false);
    holdLipSync(first, 700, t0 + 900);
    expect(sampleSpeech(t0 + 1200)?.mouth ?? 0).toBeGreaterThan(0);
    clock.duration = 4.2;
    clock.currentTime = 0.1;
    syncLipToAudio(first, clock.duration, clock.currentTime, t0 + 1100);
    expect(sampleSpeech(t0 + 1100 + 3000)?.mouth ?? 0).toBeGreaterThan(0.05);
    const next = noteSpeechStarted('still talking through the last word here', t0 + 2000);
    finishLipSync(first, t0 + 2000, 0);
    expect(sampleSpeech(t0 + 2100)?.mouth ?? 0).toBeGreaterThan(0);
    finishLipSync(next, t0 + 2000, 0);
    expect(sampleSpeech(t0 + 2200)).toBeNull();
  });
});
