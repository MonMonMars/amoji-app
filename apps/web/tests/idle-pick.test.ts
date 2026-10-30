import { afterEach, describe, expect, it } from 'vitest';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import {
  IDLE_LIBRARY,
  defaultEnabledNums,
  idleByCId,
  idleByNum,
  playableIdles,
} from '../lib/idle-library';
import {
  forgetIdleEnabledCache,
  isIdleEnabled,
  listEnabledIdleClipIds,
  resetIdleEnabled,
  setIdleEnabled,
} from '../lib/idle-enabled';
import {
  forgetIdlePickCache,
  idlePickFor,
  resetIdlePicks,
  saveIdlePick,
} from '../lib/idle-pick';

afterEach(() => {
  resetIdlePicks();
  resetIdleEnabled();
  forgetIdleEnabledCache();
});

describe('idle library numbers', () => {
  it('uses contiguous # starting at 1 for standing idles', () => {
    expect(IDLE_LIBRARY[0]?.num).toBe(1);
    for (let i = 1; i < IDLE_LIBRARY.length; i++) {
      expect(IDLE_LIBRARY[i]!.num).toBe(IDLE_LIBRARY[i - 1]!.num + 1);
    }
  });

  it('defaults #1+#2 to IdleBreathCalm and StandardIdle', () => {
    expect(idleByNum(1)?.clipId).toBe('IdleBreathCalm');
    expect(idleByNum(2)?.clipId).toBe('StandardIdle');
    expect(defaultEnabledNums()).toEqual([1, 2]);
  });

  it('maps free-library C01 to LookAround as #3', () => {
    expect(idleByCId('C01')?.num).toBe(3);
    expect(idleByCId('C01')?.clipId).toBe('LookAround');
    expect(idleByCId('C01')?.playable).toBe(true);
    expect(idleByCId('C56')?.clipId).toBe('Thinking');
  });

  it('exposes playable options as # labels for chat rails', () => {
    expect(IDLE_CLIP_OPTIONS[0]?.label).toBe('1');
    expect(IDLE_CLIP_OPTIONS.find((c) => c.id === 'IdleBreathCalm')?.num).toBe(1);
    expect(new Set(IDLE_CLIP_OPTIONS.map((c) => c.num)).size).toBe(IDLE_CLIP_OPTIONS.length);
    expect(playableIdles().every((e) => e.planted && e.playable)).toBe(true);
  });
});

describe('idle enable + pick', () => {
  it('persists enable toggles and keeps a non-empty pool', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    forgetIdleEnabledCache();
    expect(isIdleEnabled(1)).toBe(true);
    setIdleEnabled(3, true);
    expect(isIdleEnabled(3)).toBe(true);
    expect(listEnabledIdleClipIds()).toContain('LookAround');
    setIdleEnabled(1, false);
    setIdleEnabled(2, false);
    setIdleEnabled(3, false);
    expect(listEnabledIdleClipIds()).toEqual(['IdleBreathCalm', 'StandardIdle']);
  });

  it('saves a pin per companion by clip id', () => {
    expect(saveIdlePick('a01-shino', 'IdleBreathCalm')).toBe('IdleBreathCalm');
    expect(idlePickFor('a01-shino')).toBe('IdleBreathCalm');
    expect(saveIdlePick('a01-shino', 'not-a-clip')).toBe('IdleBreathCalm');
  });

  it('clears legacy a01-a04 pins so calm defaults return', () => {
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
  });
});

