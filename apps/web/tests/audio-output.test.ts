import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ensureCompanionPlaybackRoute,
  getDefaultSinkId,
  pinDefaultOutput,
  pinDefaultOutputAsync,
  resetDefaultSinkCacheForTests,
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
    // Simulate a poisoned cache from a communications endpoint (post-mic).
    const poisoned = {
      setSinkId(id: string) {
        if (id === 'communications-headset-uuid') return Promise.resolve();
        return Promise.reject(new Error(`unexpected ${id}`));
      },
      sinkId: 'communications-headset-uuid',
    };
    // First pin with a fake success on '' so cache is healthy.
    const ok: string[] = [];
    await pinDefaultOutputAsync({
      setSinkId(id: string) {
        ok.push(id);
        return Promise.resolve();
      },
    });
    expect(ok).toEqual(['']);
    expect(getDefaultSinkId()).toBe('');
    // Later pins must keep using '' / default — never a device uuid.
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
  });

  it('source never copies AudioContext.sinkId into preferredSinkId', () => {
    // #406 preferredSinkId read sharedCtx.sinkId — after mic that was a
    // communications UUID, so non-Yue / male TTS left the default speakers
    // while Yue female (gate sample) stayed on the expected device.
    const src = readFileSync(join(__dirname, '../lib/audio-output.ts'), 'utf8');
    expect(src).not.toMatch(/sharedCtx[\s\S]{0,80}\.sinkId/);
    expect(src).toContain("id === '' || id === 'default'");
    expect(src).toContain('Never copy AudioContext.sinkId');
  });
});
