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
  forgetIdlePickCache();
});

function mockStorage() {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  return store;
}

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
    // Passiveive loop also enables LookAround (#3) + Relax (#32) by default.
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

describe('idle enable + pick', () => {
  it('persists enable toggles and keeps a non-empty pool', () => {
    mockStorage();
    forgetIdleEnabledCache();
    expect(isIdleEnabled(10)).toBe(true); // InnersceneSam upright default
    expect(isIdleEnabled(6)).toBe(false);
    expect(isIdleEnabled(5)).toBe(true);
    expect(isIdleEnabled(11)).toBe(false);
    expect(isIdleEnabled(8)).toBe(false);
    expect(isIdleEnabled(3)).toBe(false);
    const thinkRail = IDLE_CLIP_OPTIONS.find((c) => c.id === 'Thinking')!.num;
    setIdleEnabled(thinkRail, true);
    expect(isIdleEnabled(thinkRail)).toBe(true);
    expect(listEnabledIdleClipIds()).toContain('Thinking');
    setIdleEnabled(10, false);
    setIdleEnabled(thinkRail, false);
    // Empty enable → reset to InnersceneSam (rail #10)
    expect(listEnabledIdleClipIds()).toEqual(
      expect.arrayContaining(['IdleInnersceneSam', 'IdleRpmFStanding001']),
    );
  });

  it('saves a pin per companion by clip id', () => {
    expect(saveIdlePick('a01-shino', 'IdleRpmFStanding001')).toBe('IdleRpmFStanding001');
    expect(idlePickFor('a01-shino')).toBe('IdleRpmFStanding001');
    expect(saveIdlePick('a01-shino', 'not-a-clip')).toBe('IdleRpmFStanding001');
  });

  it('drops HelloWave pins — farewell wave is not a saved idle', () => {
    const store = mockStorage();
    store.set('amoji.idlePick.v6', JSON.stringify({ 'a01-shino': 'HelloWave' }));
    forgetIdlePickCache();
    expect(idlePickFor('a01-shino')).toBeNull();
  });

  it('scrubs known-bad pins but keeps owner-selected good stands', () => {
    const store = mockStorage();
    store.set('amoji.idlePick.v6', JSON.stringify({
      'a01-shino': 'IdleHug',
      'a02-shibu': 'StandardIdle',
      'a03-fumiriya': 'LookAround',
      'a04-sassy': 'IdleSassy',
      'a05-mvar': 'IdleRpmMVar001',
      'a06-breath': 'IdleBreathCalm',
      'a07-ok': 'IdleRpmFStanding001',
      'a08-mstand': 'IdleRpmMStanding001',
      'a09-mixamo': 'IdleMixamoBreathing',
      'a10-sam': 'IdleInnersceneSam',
      'a11-fvar': 'IdleRpmFVar001',
    }));
    forgetIdlePickCache();
    expect(idlePickFor('a01-shino')).toBeNull();
    expect(idlePickFor('a02-shibu')).toBeNull();
    expect(idlePickFor('a03-fumiriya')).toBeNull();
    expect(idlePickFor('a04-sassy')).toBeNull();
    expect(idlePickFor('a05-mvar')).toBeNull();
    expect(idlePickFor('a06-breath')).toBeNull();
    // Owner good picks survive — do not wipe on scrub.
    expect(idlePickFor('a07-ok')).toBe('IdleRpmFStanding001');
    expect(idlePickFor('a08-mstand')).toBe('IdleRpmMStanding001');
    expect(idlePickFor('a09-mixamo')).toBe('IdleMixamoBreathing');
    expect(idlePickFor('a10-sam')).toBe('IdleInnersceneSam');
    expect(idlePickFor('a11-fvar')).toBe('IdleRpmFVar001');
  });

  it('migrates v3/v4/v5 owner picks forward into v6 (no wipe of good pins)', () => {
    const store = mockStorage();
    store.set('amoji.idlePick.v3', JSON.stringify({
      'a01-shino': 'IdleMixamoBreathing',
      'a02-shibu': 'IdleInnersceneSam',
      'a03-bad': 'IdleBreathCalm',
    }));
    store.set('amoji.idleEnabled.v3', JSON.stringify([40, 43, 90]));
    store.set('amoji.idlePick.v4', JSON.stringify({
      'a01-shino': 'IdleRpmMStanding001',
    }));
    store.set('amoji.idleEnabled.v4', JSON.stringify([5, 11]));
    store.set('amoji.idlePick.v5', JSON.stringify({
      'a04-v5': 'IdleRpmFVar001',
    }));
    store.set('amoji.idleEnabled.v5', JSON.stringify([5, 8, 11]));
    forgetIdlePickCache();
    forgetIdleEnabledCache();
    // Newest legacy (v5) wins for pick migrate when v6 empty.
    expect(idlePickFor('a04-v5')).toBe('IdleRpmFVar001');
    // v5 enable [5,8,11] → IdleRpmFStanding001 + IdleRpmFVar001 + IdleRpmMStanding001
    expect(listEnabledIdleClipIds()).toEqual(expect.arrayContaining(['IdleRpmFStanding001','IdleRpmFVar001','IdleRpmMStanding001']));
    expect(store.has('amoji.idlePick.v3')).toBe(false);
    expect(store.has('amoji.idleEnabled.v3')).toBe(false);
    expect(store.has('amoji.idlePick.v4')).toBe(false);
    expect(store.has('amoji.idleEnabled.v4')).toBe(false);
    expect(store.has('amoji.idlePick.v5')).toBe(false);
    expect(store.has('amoji.idleEnabled.v5')).toBe(false);
    expect(store.has('amoji.idlePick.v6')).toBe(true);
    expect(store.has('amoji.idleEnabled.v6')).toBe(true);
  });

  it('migrates v4 dual-stand enables when no newer key exists', () => {
    const store = mockStorage();
    store.set('amoji.idleEnabled.v4', JSON.stringify([5, 11]));
    store.set('amoji.idlePick.v4', JSON.stringify({
      'a01-shino': 'IdleRpmMStanding001',
      'a02-bad': 'IdleSassy',
    }));
    forgetIdlePickCache();
    forgetIdleEnabledCache();
    expect(idlePickFor('a01-shino')).toBe('IdleRpmMStanding001');
    expect(idlePickFor('a02-bad')).toBeNull();
    expect(listEnabledIdleClipIds()).toEqual(expect.arrayContaining(['IdleRpmFStanding001','IdleRpmMStanding001']));
    expect(JSON.parse(store.get('amoji.idleEnabled.v6')!)).toEqual(expect.arrayContaining([5, 11]));
  });

  it('refuses to save BreathCalm / Sassy / sky-look pins', () => {
    expect(saveIdlePick('a01-shino', 'IdleBreathCalm')).toBeNull();
    expect(saveIdlePick('a01-shino', 'IdleSassy')).toBeNull();
    expect(saveIdlePick('a01-shino', 'LookAround')).toBeNull();
    expect(saveIdlePick('a01-shino', 'IdleRpmFStanding001')).toBe('IdleRpmFStanding001');
  });
});
