/**
 * Async voice enumeration.
 *
 * Chrome and Safari both return an EMPTY array from the first getVoices() call
 * and populate it a beat later, announcing the change with `voiceschanged`.
 * A picker that reads synchronously therefore shows "0 voices" on every cold
 * load — which is how a device with 15 installed voices came to look like a
 * device with none. These tests pin the wait-and-resolve behaviour, including
 * the failure modes: a subscription that never fires, a subscription that only
 * ever reports an empty list, and an API that does not exist at all.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  buildAllInventories,
  dedupeVoices,
  loadVoices,
  onVoicesChanged,
  readVoices,
  summarizeInventory,
  type RawVoice,
  type SynthLike,
} from '../lib/browser-voices';

/** A fake engine that starts empty and fills on demand, like a real browser. */
function fakeSynth(opts?: { emptyOnly?: boolean }): SynthLike & {
  fill(list: RawVoice[]): void;
  listenerCount(): number;
} {
  let list: RawVoice[] = [];
  const listeners = new Set<() => void>();
  return {
    getVoices: () => list,
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'voiceschanged') listeners.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === 'voiceschanged') listeners.delete(fn);
    },
    fill(next: RawVoice[]) {
      list = opts?.emptyOnly ? [] : next;
      for (const fn of [...listeners]) fn();
    },
    listenerCount: () => listeners.size,
  };
}

const VOICES: RawVoice[] = [
  { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true },
];

describe('loadVoices waits for voiceschanged', () => {
  it('resolves immediately when the engine is already populated', async () => {
    const synth = fakeSynth();
    synth.fill(VOICES);
    const got = await loadVoices({ synth, timeoutMs: 50 });
    expect(got.map((v) => v.name)).toEqual([VOICES[0]!.name]);
  });

  it('waits for the async fill instead of returning the initial empty list', async () => {
    const synth = fakeSynth();
    // This is the real browser sequence: call, empty result, later event.
    const pending = loadVoices({ synth, timeoutMs: 200 });
    expect(readVoices(synth)).toEqual([]);
    queueMicrotask(() => synth.fill(VOICES));
    const got = await pending;
    expect(got.length).toBe(1);
  });

  it('ignores a voiceschanged that still carries an empty list', async () => {
    const synth = fakeSynth({ emptyOnly: true });
    const pending = loadVoices({ synth, timeoutMs: 30 });
    synth.fill(VOICES);
    const got = await pending;
    // Timed out with everything available at that point (still empty).
    expect(got).toEqual([]);
  });

  it('resolves with a populated list even after an empty event first', async () => {
    const synth = fakeSynth({ emptyOnly: true });
    const pending = loadVoices({ synth, timeoutMs: 200 });
    synth.fill(VOICES); // fires an event, but the fake still reports []
    (synth as unknown as { getVoices: () => RawVoice[] }).getVoices = () => VOICES;
    synth.fill(VOICES);
    const got = await pending;
    expect(got.length).toBe(1);
  });

  it('unsubscribes once it has resolved, so listeners do not accumulate', async () => {
    const synth = fakeSynth();
    const pending = loadVoices({ synth, timeoutMs: 200 });
    expect(synth.listenerCount()).toBe(1);
    synth.fill(VOICES);
    await pending;
    expect(synth.listenerCount()).toBe(0);
  });

  it('resolves an empty list on timeout when the API never answers', async () => {
    const synth = fakeSynth({ emptyOnly: true });
    const started = Date.now();
    const got = await loadVoices({ synth, timeoutMs: 25 });
    expect(got).toEqual([]);
    // The timeout is what released it; this must not hang.
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('an absent API resolves [] rather than throwing', async () => {
    await expect(loadVoices({ synth: null })).resolves.toEqual([]);
  });

  it('a getVoices() that throws is treated as no voices', () => {
    const synth: SynthLike = {
      getVoices() { throw new Error('blocked by policy'); },
    };
    expect(readVoices(synth)).toEqual([]);
  });

  it('uses the injected timers rather than a real clock', async () => {
    const synth = fakeSynth({ emptyOnly: true });
    const setTimeoutFn = vi.fn((fn: () => void) => { queueMicrotask(fn); return 1; });
    const clearTimeoutFn = vi.fn();
    await loadVoices({ synth, timeoutMs: 9999, setTimeoutFn, clearTimeoutFn });
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 9999);
  });
});

describe('onVoicesChanged', () => {
  it('delivers a later list (a voice installed while Settings is open)', () => {
    const synth = fakeSynth();
    const seen: number[] = [];
    const off = onVoicesChanged((list) => seen.push(list.length), synth);
    synth.fill([]);
    synth.fill(VOICES);
    off();
    synth.fill(VOICES);
    expect(seen).toEqual([0, 1]);
  });

  it('is a no-op without an engine', () => {
    const off = onVoicesChanged(() => { throw new Error('should not fire'); }, null);
    expect(typeof off).toBe('function');
    off();
  });
});

describe('dedupeVoices', () => {
  it('collapses the same speaker reported twice under one locale', () => {
    const got = dedupeVoices([
      { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true },
      { name: 'Microsoft Tracy Desktop - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh_HK', localService: true },
    ]);
    expect(got.length).toBe(1);
  });

  it('keeps a distinct default flag when collapsing', () => {
    const got = dedupeVoices([
      { name: 'Tracy', lang: 'zh-HK', localService: true, default: false },
      { name: 'Tracy Desktop', lang: 'zh-HK', localService: true, default: true },
    ]);
    expect(got.length).toBe(1);
    expect(got[0]!.default).toBe(true);
  });

  it('does not merge two different speakers', () => {
    const got = dedupeVoices([
      { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true },
      { name: 'Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true },
    ]);
    expect(got.length).toBe(2);
  });

  it('drops entries with no usable name', () => {
    const got = dedupeVoices([
      { name: '', lang: 'en-US' },
      { name: '   ', lang: 'en-US' },
      { name: 'Zira', lang: 'en-US', localService: true },
    ] as RawVoice[]);
    expect(got.map((v) => v.name)).toEqual(['Zira']);
  });
});

describe('buildAllInventories', () => {
  it('builds all four languages from one device read', () => {
    const raw: RawVoice[] = [
      { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK', localService: true },
      { name: 'Microsoft Huihui - Chinese (Simplified, PRC)', lang: 'zh-CN', localService: true },
      { name: 'Microsoft Ichiro - Japanese (Japan)', lang: 'ja-JP', localService: true },
      { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
    ];
    const all = buildAllInventories(raw, 'windows');
    expect(all.yue.native.every((v) => v.langKey === 'zh-hk')).toBe(true);
    expect(all.zh.native.every((v) => v.langKey === 'zh-cn')).toBe(true);
    expect(all.ja.native.length).toBe(1);
    expect(all.en.native.length).toBe(1);
    // Same device, so the device total is identical across all four tables.
    expect(new Set(Object.values(all).map((i) => i.deviceTotal)).size).toBe(1);
  });

  it('summarizeInventory reports network-only voices separately', () => {
    const inv = buildAllInventories([
      { name: 'Google 粵語（香港）', lang: 'zh-HK', localService: false },
    ], 'windows').yue;
    const sum = summarizeInventory(inv);
    expect(sum.female).toBe(1);
    expect(sum.networkOnly).toBe(1);
    expect(sum.meetsThree).toBe(false);
  });
});
