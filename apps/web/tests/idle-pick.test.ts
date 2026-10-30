import { afterEach, describe, expect, it } from 'vitest';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import {
  forgetIdlePickCache,
  idlePickFor,
  resetIdlePicks,
  saveIdlePick,
} from '../lib/idle-pick';

afterEach(() => resetIdlePicks());

describe('idle clip rails', () => {
  it('labels the on-disk idles a01 / b02 and keeps them unique', () => {
    expect(IDLE_CLIP_OPTIONS.map((c) => c.label)).toEqual([
      'a01', 'a02', 'a03', 'a04', 'b01', 'b02', 'b03', 'b04',
    ]);
    expect(new Set(IDLE_CLIP_OPTIONS.map((c) => c.id)).size).toBe(IDLE_CLIP_OPTIONS.length);
    expect(IDLE_CLIP_OPTIONS.find((c) => c.label === 'b01')?.id).toBe('IdleBreathCalm');
  });

  it('saves a pin per companion', () => {
    expect(saveIdlePick('a01-shino', 'IdleBreathCalm')).toBe('IdleBreathCalm');
    expect(idlePickFor('a01-shino')).toBe('IdleBreathCalm');
    expect(idlePickFor('a02-shibu')).toBeNull();
    expect(saveIdlePick('a01-shino', 'not-a-clip')).toBe('IdleBreathCalm');
  });

  it('clears legacy a01–a04 pins so calm b01/b02 rotation returns', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    store.set('amoji.idlePick.v1', JSON.stringify({
      'a01-shino': 'IdleHug',
      'a02-shibu': 'StandardIdle',
      'a03-fumiriya': 'LookAround',
    }));
    forgetIdlePickCache();
    expect(idlePickFor('a01-shino')).toBeNull();
    expect(idlePickFor('a02-shibu')).toBe('StandardIdle');
    expect(idlePickFor('a03-fumiriya')).toBe('LookAround');
    const saved = JSON.parse(store.get('amoji.idlePick.v1')!);
    expect(saved['a01-shino']).toBeUndefined();
    expect(saved['a02-shibu']).toBe('StandardIdle');
  });
});
