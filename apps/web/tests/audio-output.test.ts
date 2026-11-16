import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ensureCompanionPlaybackRoute,
  getDefaultSinkId,
  htmlAudioStartMode,
  isDefaultSinkId,
  markMicCommsRoutingLatch,
  micCommsRoutingLatchActive,
  pinDefaultOutput,
  pinDefaultOutputAsync,
  resetDefaultSinkCacheForTests,
  startHtmlAudioOnDefaultSpeakers,
} from '../lib/audio-output';

describe('default audio output', () => {
  beforeEach(() => {
    resetDefaultSinkCacheForTests();
  });

  it('forces playback session so mic communications sink does not steal TTS', () => {
    const nav = globalThis.navigator as Navigator & { audioSession?: { type: string } };
    const prev = nav.audioSession;
    nav.audioSession = { type: 'play-and-record' };
    ensureCompanionPlaybackRoute();
    expect(nav.audioSession.type).toBe('playback');
    if (prev) nav.audioSession = prev;
    else delete (nav as { audioSession?: { type: string } }).audioSession;
  });

  it('asks for the empty sink, then the default id', async () => {
    const calls: string[] = [];
    const node = {
      setSinkId(id: string) {
        calls.push(id);
        return id === '' ? Promise.reject(new Error('unsupported')) : Promise.resolve();
      },
    };
    await pinDefaultOutputAsync(node);
    expect(calls).toEqual(['', 'default']);
  });

  it('ignores nodes that cannot choose a sink', () => {
    expect(() => pinDefaultOutput(null)).not.toThrow();
    expect(() => pinDefaultOutput({})).not.toThrow();
  });

  it('awaits pin before callers proceed (async helper)', async () => {
    const calls: string[] = [];
    const node = {
      setSinkId(id: string) {
        calls.push(id);
        return Promise.resolve();
      },
    };
    await pinDefaultOutputAsync(node);
    expect(calls[0]).toBe('');
    expect(getDefaultSinkId()).toBe('');
  });

  it('never caches a hardware device id as the preferred sink', async () => {
    const poisoned = {
      setSinkId(id: string) {
        if (id === 'communications-headset-uuid') return Promise.resolve();
        return Promise.reject(new Error(`unexpected ${id}`));
      },
      sinkId: 'communications-headset-uuid',
    };
    const ok: string[] = [];
    await pinDefaultOutputAsync({
      setSinkId(id: string) {
        ok.push(id);
        return Promise.resolve();
      },
    });
    expect(ok).toEqual(['']);
    expect(getDefaultSinkId()).toBe('');
    const later: string[] = [];
    await pinDefaultOutputAsync({
      setSinkId(id: string) {
        later.push(id);
        return Promise.resolve();
      },
      sinkId: poisoned.sinkId,
    });
    expect(later).toEqual(['']);
    expect(later.every((id) => id === '' || id === 'default')).toBe(true);
  });

  it('re-pins to default when the element already latched a communications sink', async () => {
    const calls: string[] = [];
    await pinDefaultOutputAsync({
      sinkId: 'communications-headset-uuid',
      setSinkId(id: string) {
        calls.push(id);
        return Promise.resolve();
      },
    });
    expect(calls).toEqual(['']);
    expect(getDefaultSinkId()).toBe('');
    expect(isDefaultSinkId(getDefaultSinkId())).toBe(true);
  });

  it('source never copies AudioContext.sinkId into preferredSinkId', () => {
    const src = readFileSync(join(__dirname, '../lib/audio-output.ts'), 'utf8');
    expect(src).not.toMatch(/sharedCtx[\s\S]{0,80}\.sinkId/);
    expect(src).toContain("id === '' || id === 'default'");
    expect(src).toContain('Never copy AudioContext.sinkId');
  });

  it('pin-before-play awaits default sink before play (chat mic route)', async () => {
    const order: string[] = [];
    const audio = {
      setSinkId(id: string) {
        order.push(`sink:${id}`);
        return Promise.resolve();
      },
      play() {
        order.push('play');
        return Promise.resolve();
      },
    } as unknown as HTMLAudioElement;
    await startHtmlAudioOnDefaultSpeakers(audio, 'pin-before-play');
    expect(order[0]).toBe('sink:');
    expect(order).toContain('play');
    expect(order.indexOf('sink:')).toBeLessThan(order.indexOf('play'));
  });

  it('gesture-safe plays first and only pins on reject-retry', async () => {
    const order: string[] = [];
    let attempts = 0;
    const audio = {
      setSinkId(id: string) {
        order.push(`sink:${id}`);
        return Promise.resolve();
      },
      play() {
        attempts += 1;
        order.push(`play:${attempts}`);
        if (attempts === 1) return Promise.reject(new Error('NotAllowedError'));
        return Promise.resolve();
      },
    } as unknown as HTMLAudioElement;
    await startHtmlAudioOnDefaultSpeakers(audio, 'gesture-safe');
    expect(order[0]).toBe('play:1');
    expect(order).toContain('sink:');
    expect(order).toContain('play:2');
    expect(order.indexOf('play:1')).toBeLessThan(order.indexOf('sink:'));
  });

  it('htmlAudioStartMode upgrades gesture paths after mic play-and-record', () => {
    resetDefaultSinkCacheForTests();
    expect(htmlAudioStartMode(false)).toBe('gesture-safe');
    expect(htmlAudioStartMode(true)).toBe('pin-before-play');
    markMicCommsRoutingLatch(true);
    expect(micCommsRoutingLatchActive()).toBe(true);
    expect(htmlAudioStartMode(false)).toBe('pin-before-play');
    markMicCommsRoutingLatch(false);
    expect(htmlAudioStartMode(false)).toBe('gesture-safe');
  });
});
