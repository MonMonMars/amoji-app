import { afterEach, describe, expect, it } from 'vitest';
import {
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
  it('has contiguous rail 1..N, all playable, none retired', () => {
    assertCuratedRailValid();
    expect(CHAT_IDLE_CURATED.length).toBeGreaterThanOrEqual(25);
    expect(CHAT_IDLE_CURATED.length).toBeLessThanOrEqual(45);
    expect(IDLE_CLIP_OPTIONS.length).toBe(CHAT_IDLE_CURATED.length);
    for (const o of IDLE_CLIP_OPTIONS) {
      expect(o.playable).toBe(true);
      expect(RETIRED_IDLE_CLIP_IDS.has(o.id)).toBe(false);
    }
  });

  it('retired library # never appear on curated rail', () => {
    for (const n of RETIRED_IDLE_NUMS) {
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(false);
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(false);
    }
  });

  it('defaults to a single calm upright stand (rail #5)', () => {
    expect(defaultCuratedRailNums()).toEqual([5]);
    expect(listEnabledIdleClipIds()).toEqual([
      'IdleRpmFStanding001',
    ]);
  });

  it('migrates stored legacy library enable nums to rail nums', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    const lookRail = CHAT_IDLE_CURATED.find((r) => r.legacyLibNum === 3)!.railNum;
    const robotRail = CHAT_IDLE_CURATED.find((r) => r.legacyLibNum === 101)!.railNum;
    expect(migrateEnabledNumsToRail([3, 40, 101], 'library').sort()).toEqual(
      [lookRail, 3, robotRail].sort(), // legacy 40 → Mixamo rail 3
    );
    // Rail-kind must not remap #5 (IdleRpmFStanding001) via library #5 (KayKit).
    expect(migrateEnabledNumsToRail([5, 11], 'rail')).toEqual([5, 11]);
    // v1 library # → rail; LookAround (legacy #3 / sky-look) is scrubbed.
    store.set('amoji.idleEnabled.v1', JSON.stringify([3, 40, 101]));
    forgetIdleEnabledCache();
    const enabled = listEnabledNums();
    expect(enabled).not.toContain(lookRail);
    expect(enabled).toContain(robotRail);
    expect(enabled).toContain(3); // Mixamo breathing (legacy 40)
    const thinkRail = CHAT_IDLE_CURATED.find((r) => r.clipId === 'Thinking')!.railNum;
    setIdleEnabled(thinkRail, true);
    expect(listEnabledIdleClipIds()).toContain('Thinking');
    // Known-bad sky-look cannot be re-enabled.
    setIdleEnabled(lookRail, true);
    expect(listEnabledIdleClipIds()).not.toContain('LookAround');
  });

  it('resolveLegacyLibPin maps library # or clip id', () => {
    expect(resolveLegacyLibPin('3')).toBe('LookAround');
    // Retired #96 remaps to idle-retired DEFAULT (Quaternius after #430).
    // Owner IdleRpmFStanding001 pins still migrate via idle-owner-migrate.
    expect(resolveLegacyLibPin('96')).toBe('IdleQuaterniusHuman');
    expect(resolveLegacyLibPin('LookAround')).toBe('LookAround');
    expect(idleByNum(96)?.retired).toBe(true);
    expect(idleClipById('LookAround')?.num).toBe(
      CHAT_IDLE_CURATED.find((r) => r.clipId === 'LookAround')!.railNum,
    );
  });
});
