import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDefaultSinkId,
  pinDefaultOutput,
  pinDefaultOutputAsync,
  resetDefaultSinkCacheForTests,
} from '../lib/audio-output';

describe('default audio output', () => {
  beforeEach(() => {
    resetDefaultSinkCacheForTests();
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
