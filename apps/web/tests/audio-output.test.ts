import { describe, expect, it } from 'vitest';
import { pinDefaultOutput } from '../lib/audio-output';

describe('default audio output', () => {
  it('asks for the empty sink, then the default id', async () => {
    const calls: string[] = [];
    const node = {
      setSinkId(id: string) {
        calls.push(id);
        return id === '' ? Promise.reject(new Error('unsupported')) : Promise.resolve();
      },
    };
    pinDefaultOutput(node);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual(['', 'default']);
  });

  it('ignores nodes that cannot choose a sink', () => {
    expect(() => pinDefaultOutput(null)).not.toThrow();
    expect(() => pinDefaultOutput({})).not.toThrow();
  });
});
