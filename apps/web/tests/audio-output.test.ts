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
});
