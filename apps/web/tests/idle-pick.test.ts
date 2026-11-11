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

  it('defaults library enable to Pixel-OK #42 stand + #3 look', () => {
    expect(idleByNum(1)?.clipId).toBe('IdleBreathCalm');
    expect(idleByNum(2)?.clipId).toBe('StandardIdle');
    expect(idleByNum(42)?.clipId).toBe('IdleRpmFStanding001');
    expect(defaultEnabledNums()).toEqual([3, 42]);
  });

  it('maps free-library C01 to LookAround as #3', () => {
    expect(idleByCId('C01')?.num).toBe(3);
    expect(idleByCId('C01')?.clipId).toBe('LookAround');
    expect(idleByCId('C01')?.playable).toBe(true);
    expect(idleByCId('C56')?.clipId).toBe('Thinking');
  });

  it('maps #13 C42 to unique lib_C42 LookingAround02 (not LookAround/#3)', () => {
    expect(idleByNum(13)?.cId).toBe('C42');
    expect(idleByNum(13)?.clipId).toBe('lib_C42');
    expect(idleByNum(13)?.vrmaUrl).toBe('models/anims/lib_C42.vrma');
    expect(idleByCId('C42')?.num).toBe(13);
    expect(idleByCId('C42')?.clipId).toBe('lib_C42');
    expect(idleByNum(3)?.clipId).toBe('LookAround');
    expect(idleByNum(13)?.clipId).not.toBe(idleByNum(3)?.clipId);
    const playable = playableIdles().map((e) => e.clipId);
    expect(playable).toContain('LookAround');
    expect(playable).toContain('lib_C42');
  });

  it('exposes curated rail options as sequential # labels (Pixel calm idle only)', () => {
    expect(IDLE_CLIP_OPTIONS[0]?.label).toBe('1');
    expect(IDLE_CLIP_OPTIONS.find((c) => c.id === 'IdleRpmFStanding001')?.num).toBe(1);
    expect(IDLE_CLIP_OPTIONS.find((c) => c.id === 'IdleSassy')?.num).toBe(2);
    expect(IDLE_CLIP_OPTIONS.find((c) => c.id === 'LookAround')?.num).toBe(3);
    expect(new Set(IDLE_CLIP_OPTIONS.map((c) => c.num)).size).toBe(IDLE_CLIP_OPTIONS.length);
    expect(IDLE_CLIP_OPTIONS.length).toBe(6);
    expect(IDLE_CLIP_OPTIONS.length).toBeLessThan(playableIdles().length);
    expect(playableIdles().every((e) => e.playable)).toBe(true);
    expect(
      IDLE_CLIP_OPTIONS.every((o) => {
        const e = playableIdles().find((p) => p.clipId === o.id);
        return e?.planted === true;
      }),
    ).toBe(true);
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
    const lookRail = IDLE_CLIP_OPTIONS.find((c) => c.id === 'LookAround')!.num;
    setIdleEnabled(lookRail, true);
    expect(isIdleEnabled(lookRail)).toBe(true);
    expect(listEnabledIdleClipIds()).toContain('LookAround');
    // Emptying the pool resets to curated defaults (rail 1+2 = stand + sassy).
    setIdleEnabled(1, false);
    setIdleEnabled(2, false);
    setIdleEnabled(lookRail, false);
    expect(listEnabledIdleClipIds()).toEqual(['IdleRpmFStanding001', 'IdleSassy']);
  });

  it('saves a pin per companion by clip id (Pixel calm only)', () => {
    expect(saveIdlePick('a01-shino', 'IdleRpmFStanding001')).toBe('IdleRpmFStanding001');
    expect(idlePickFor('a01-shino')).toBe('IdleRpmFStanding001');
    expect(saveIdlePick('a01-shino', 'not-a-clip')).toBe('IdleRpmFStanding001');
    expect(saveIdlePick('a01-shino', 'IdleBreathCalm')).toBe('IdleRpmFStanding001');
    expect(saveIdlePick('a01-shino', 'YesCheer')).toBe('IdleRpmFStanding001');
  });

  it('drops HelloWave pins — farewell wave is not a saved idle', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    store.set('amoji.idlePick.v1', JSON.stringify({ 'a01-shino': 'HelloWave' }));
    forgetIdlePickCache();
    expect(idlePickFor('a01-shino')).toBeNull();
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
    expect(idlePickFor('a02-shibu')).toBeNull();
    expect(idlePickFor('a03-fumiriya')).toBe('LookAround');
  });
});

