import { afterEach, describe, expect, it } from 'vitest';
import {
  PIXEL_CALM_IDLE_NUMS,
  RETIRED_IDLE_CLIP_IDS,
  RETIRED_IDLE_NUMS,
  resolveLegacyLibPin,
} from '../lib/idle-catalog-review';
import { IDLE_CLIP_OPTIONS, idleClipById } from '../lib/idle-clips';
import {
  CHAT_IDLE_CURATED,
  assertCuratedRailValid,
  defaultCuratedRailNums,
  migrateEnabledNumsToRail,
} from '../lib/idle-curated-rail';
import {
  forgetIdleEnabledCache,
  listEnabledIdleClipIds,
  listEnabledNums,
  resetIdleEnabled,
  setIdleEnabled,
} from '../lib/idle-enabled';
import { idleByNum } from '../lib/idle-library';

afterEach(() => {
  resetIdleEnabled();
  forgetIdleEnabledCache();
});

describe('curated idle chat rail', () => {
  it('has contiguous rail 1..N calm-only, all playable, none retired', () => {
    assertCuratedRailValid();
    expect(CHAT_IDLE_CURATED.length).toBe(PIXEL_CALM_IDLE_NUMS.size);
    expect(CHAT_IDLE_CURATED.length).toBe(6);
    expect(IDLE_CLIP_OPTIONS.length).toBe(CHAT_IDLE_CURATED.length);
    for (const o of IDLE_CLIP_OPTIONS) {
      expect(o.playable).toBe(true);
      expect(RETIRED_IDLE_CLIP_IDS.has(o.id)).toBe(false);
      expect(PIXEL_CALM_IDLE_NUMS.has(o.libNum)).toBe(true);
    }
  });

  it('retired library # never appear on curated rail', () => {
    for (const n of RETIRED_IDLE_NUMS) {
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(false);
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(false);
    }
  });

  it('defaults to curated rail #1+#2 calm stand + sassy', () => {
    expect(defaultCuratedRailNums()).toEqual([1, 2]);
    expect(listEnabledIdleClipIds()).toEqual(['IdleRpmFStanding001', 'IdleSassy']);
  });

  it('migrates stored legacy library enable nums to calm rail nums', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    // 3=LookAround (calm), 40=breathing (not calm rail), 101=robot (perf — off rail)
    store.set('amoji.idleEnabled.v1', JSON.stringify([3, 40, 101]));
    forgetIdleEnabledCache();
    const lookRail = CHAT_IDLE_CURATED.find((r) => r.legacyLibNum === 3)!.railNum;
    expect(migrateEnabledNumsToRail([3, 40, 101])).toEqual([lookRail]);
    const enabled = listEnabledNums();
    expect(enabled).toEqual([lookRail]);
    expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === 101)).toBe(false);
    setIdleEnabled(lookRail, true);
    expect(listEnabledIdleClipIds()).toContain('LookAround');
  });

  it('resolveLegacyLibPin maps library # or clip id', () => {
    expect(resolveLegacyLibPin('3')).toBe('LookAround');
    expect(resolveLegacyLibPin('96')).toBe('IdleRpmFStanding001');
    expect(resolveLegacyLibPin('LookAround')).toBe('LookAround');
    expect(idleByNum(96)?.retired).toBe(true);
    expect(idleClipById('LookAround')?.num).toBe(
      CHAT_IDLE_CURATED.find((r) => r.clipId === 'LookAround')!.railNum,
    );
  });
});
