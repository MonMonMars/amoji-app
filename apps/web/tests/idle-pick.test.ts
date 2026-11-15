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
import { DEFAULT_IDLE_CLIP_ID } from '../lib/idle-retired';
import { forgetIdlePrefsScrub } from '../lib/idle-prefs-scrub';

afterEach(() => {
  resetIdlePicks();
  resetIdleEnabled();
  forgetIdleEnabledCache();
  forgetIdlePickCache();
  forgetIdlePrefsScrub();
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
    expect(defaultEnabledNums()).toEqual([1, 2, 3, 32]);
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

  it('exposes curated rail options as sequential # labels', () => {
    expect(IDLE_CLIP_OPTIONS[0]?.label).toBe('1');
    expect(IDLE_CLIP_OPTIONS.find((c) => c.id === 'IdleBreathCalm')?.num).toBe(1);
    expect(new Set(IDLE_CLIP_OPTIONS.map((c) => c.num)).size).toBe(IDLE_CLIP_OPTIONS.length);
    expect(IDLE_CLIP_OPTIONS.length).toBeLessThan(playableIdles().length);
    expect(playableIdles().every((e) => e.playable)).toBe(true);
    expect(playableIdles().filter((e) => !e.planted).length).toBeGreaterThan(0);
    expect(
      IDLE_CLIP_OPTIONS.every((o) => {
        const e = playableIdles().find((p) => p.clipId === o.id);
        return e?.planted === true;
      }),
    ).toBe(true);
  });
});

function mockStore() {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  return store;
}

describe('idle enable + pick', () => {
  it('persists enable toggles and keeps a non-empty pool', () => {
    mockStore();
    forgetIdlePrefsScrub();
    forgetIdleEnabledCache();
    expect(isIdleEnabled(6)).toBe(true);
    expect(isIdleEnabled(5)).toBe(false);
    expect(isIdleEnabled(11)).toBe(false);
    expect(isIdleEnabled(8)).toBe(false);
    expect(isIdleEnabled(3)).toBe(false);
    expect(isIdleEnabled(10)).toBe(false);
    const thinkRail = IDLE_CLIP_OPTIONS.find((c) => c.id === 'Thinking')!.num;
    setIdleEnabled(thinkRail, true);
    expect(isIdleEnabled(thinkRail)).toBe(true);
    expect(listEnabledIdleClipIds()).toContain('Thinking');
    setIdleEnabled(6, false);
    setIdleEnabled(thinkRail, false);
    expect(listEnabledIdleClipIds()).toEqual([DEFAULT_IDLE_CLIP_ID]);
  });

  it('saves a pin per companion by clip id', () => {
    expect(saveIdlePick('a01-shino', DEFAULT_IDLE_CLIP_ID)).toBe(DEFAULT_IDLE_CLIP_ID);
    expect(idlePickFor('a01-shino')).toBe(DEFAULT_IDLE_CLIP_ID);
    expect(saveIdlePick('a01-shino', 'not-a-clip')).toBe(DEFAULT_IDLE_CLIP_ID);
  });

  it('drops HelloWave pins — farewell wave is not a saved idle', () => {
    const store = mockStore();
    store.set('amoji.idlePick.v6', JSON.stringify({ 'a01-shino': 'HelloWave' }));
    forgetIdlePrefsScrub();
    forgetIdlePickCache();
    expect(idlePickFor('a01-shino')).toBeNull();
  });

  it('clears legacy bad + weak pins so Quaternius stand returns', () => {
    const store = mockStore();
    store.set('amoji.idlePick.v6', JSON.stringify({
      'a01-shino': 'IdleHug',
      'a02-shibu': 'StandardIdle',
      'a03-fumiriya': 'LookAround',
      'a04-sassy': 'IdleSassy',
      'a05-mvar': 'IdleRpmMVar001',
      'a06-weak': 'IdleMixamoBreathing',
      'a07-sam': 'IdleInnersceneSam',
      'a08-fvar': 'IdleRpmFVar001',
      'a09-mstand': 'IdleRpmMStanding001',
      'a10-breath': 'IdleBreathCalm',
      'a11-rpm': 'IdleRpmFStanding001',
      'a12-ok': DEFAULT_IDLE_CLIP_ID,
    }));
    forgetIdlePrefsScrub();
    forgetIdlePickCache();
    for (const id of ['a01-shino','a02-shibu','a03-fumiriya','a04-sassy','a05-mvar','a06-weak','a07-sam','a08-fvar','a09-mstand','a10-breath','a11-rpm']) {
      expect(idlePickFor(id)).toBeNull();
    }
    expect(idlePickFor('a12-ok')).toBe(DEFAULT_IDLE_CLIP_ID);
  });

  it('aggressively scrubs ALL prior amoji.idle* keys on hydrate (v6)', () => {
    const store = mockStore();
    store.set('amoji.idlePick.v3', JSON.stringify({ 'a01-shino': 'IdleMixamoBreathing' }));
    store.set('amoji.idleEnabled.v3', JSON.stringify([40, 43, 90]));
    store.set('amoji.idlePick.v4', JSON.stringify({ 'a01-shino': 'IdleRpmMStanding001' }));
    store.set('amoji.idleEnabled.v4', JSON.stringify([5, 11]));
    store.set('amoji.idlePick.v5', JSON.stringify({ 'a01-shino': 'IdleRpmFStanding001' }));
    store.set('amoji.idleEnabled.v5', JSON.stringify([5]));
    store.set('amoji.idleEnabled.v1.extra', 'stale');
    forgetIdlePrefsScrub();
    forgetIdlePickCache();
    forgetIdleEnabledCache();
    expect(idlePickFor('a01-shino')).toBeNull();
    expect(listEnabledIdleClipIds()).toEqual([DEFAULT_IDLE_CLIP_ID]);
    for (const k of ['amoji.idlePick.v3','amoji.idleEnabled.v3','amoji.idlePick.v4','amoji.idleEnabled.v4','amoji.idlePick.v5','amoji.idleEnabled.v5','amoji.idleEnabled.v1.extra']) {
      expect(store.has(k)).toBe(false);
    }
  });

  it('refuses to save BreathCalm / Sassy / RPM stand pins', () => {
    expect(saveIdlePick('a01-shino', 'IdleBreathCalm')).toBeNull();
    expect(saveIdlePick('a01-shino', 'IdleSassy')).toBeNull();
    expect(saveIdlePick('a01-shino', 'IdleRpmFStanding001')).toBeNull();
    expect(saveIdlePick('a01-shino', DEFAULT_IDLE_CLIP_ID)).toBe(DEFAULT_IDLE_CLIP_ID);
  });

  it('documents DEFAULT_IDLE_CLIP_ID for owner verify', () => {
    expect(DEFAULT_IDLE_CLIP_ID).toBe('IdleQuaterniusHuman');
  });
});
