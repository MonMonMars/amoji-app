import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  forgetIdleEnabledCache,
  listEnabledIdleClipIds,
  listEnabledNums,
  resetIdleEnabled,
  setIdleEnabled,
} from '../lib/idle-enabled';
import {
  IDLE_OWNER_OFFRAIL_KEY,
  forgetOwnerOffRailIdleCache,
  isOwnerOffRailIdleEnabled,
  listOwnerOffRailIdleRows,
  setOwnerOffRailIdleEnabled,
} from '../lib/idle-owner-offrail';
import { forgetOwnerPickerDecisionCache } from '../lib/owner-picker-decisions';

function mockStorage() {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
  };
  return store;
}

beforeEach(() => {
  mockStorage();
  forgetIdleEnabledCache();
  forgetOwnerOffRailIdleCache();
  forgetOwnerPickerDecisionCache();
});

afterEach(() => {
  resetIdleEnabled();
  forgetIdleEnabledCache();
  forgetOwnerOffRailIdleCache();
  forgetOwnerPickerDecisionCache();
});

describe('owner off-rail idle clips are visible and switchable (r281)', () => {
  it('lists C14/C15 owner 採用 rows even though they have no curated rail', () => {
    const rows = listOwnerOffRailIdleRows();
    expect(rows.map((r) => r.clipId)).toEqual(['IdleMixamoIdle', 'IdleMixamoStanding']);
    expect(rows.map((r) => r.label)).toEqual(['C14', 'C15']);
    expect(rows.map((r) => r.libNum)).toEqual([126, 50]);
    expect(rows.every((r) => r.playable)).toBe(true);
  });

  it('defaults ON and survives a reload of the off-list', () => {
    expect(isOwnerOffRailIdleEnabled('IdleMixamoIdle')).toBe(true);
    expect(isOwnerOffRailIdleEnabled('IdleMixamoStanding')).toBe(true);
    expect(listEnabledIdleClipIds()).toEqual(expect.arrayContaining([
      'IdleMixamoIdle',
      'IdleMixamoStanding',
    ]));
  });

  it('switching C14 off removes it from rotation; switching back restores it', () => {
    setOwnerOffRailIdleEnabled('IdleMixamoIdle', false);
    expect(isOwnerOffRailIdleEnabled('IdleMixamoIdle')).toBe(false);
    expect(listEnabledIdleClipIds()).not.toContain('IdleMixamoIdle');
    // C15 is untouched.
    expect(listEnabledIdleClipIds()).toContain('IdleMixamoStanding');

    // The off list persists; a cache reset must re-read it from localStorage.
    expect((globalThis as { localStorage: Storage }).localStorage.getItem(IDLE_OWNER_OFFRAIL_KEY))
      .toContain('IdleMixamoIdle');
    forgetOwnerOffRailIdleCache();
    expect(isOwnerOffRailIdleEnabled('IdleMixamoIdle')).toBe(false);
    setOwnerOffRailIdleEnabled('IdleMixamoIdle', true);
    expect(listEnabledIdleClipIds()).toContain('IdleMixamoIdle');
  });
});

describe('curated rail state is authoritative over the off-rail owner list', () => {
  it('rail 3 OFF ⇒ C16 absent; rail 3 ON ⇒ C16 present', () => {
    expect(listEnabledIdleClipIds()).not.toContain('IdleMixamoBreathing');

    setIdleEnabled(3, true);
    expect(listEnabledIdleClipIds()).toContain('IdleMixamoBreathing');

    setIdleEnabled(3, false);
    expect(isOwnerOffRailIdleEnabled('IdleMixamoBreathing')).toBe(false); // has a rail, not an owner row
    expect(listEnabledIdleClipIds()).not.toContain('IdleMixamoBreathing');
  });

  it('rails 22 + 23 OFF ⇒ C18 absent (it is not re-added off-rail)', () => {
    setIdleEnabled(22, true);
    setIdleEnabled(23, true);
    expect(listEnabledIdleClipIds()).toContain('IdleMixamoHappy');

    setIdleEnabled(23, false);
    expect(listEnabledIdleClipIds()).toContain('IdleMixamoHappy'); // rail 22 still ON

    setIdleEnabled(22, false);
    expect(listEnabledIdleClipIds()).not.toContain('IdleMixamoHappy');
  });

  it('rail 4/5/10 behaviour is unchanged', () => {
    expect(listEnabledNums()).toEqual(expect.arrayContaining([4, 5, 10]));
    // Rail 4 (IdleNeutral) stays listed as an enabled rail but is a known-bad
    // pin, so it never enters the playable clip list.
    expect(listEnabledIdleClipIds()).not.toContain('IdleNeutral');
    expect(listEnabledIdleClipIds()).toEqual(expect.arrayContaining([
      'IdleRpmFStanding001',
      'IdleInnersceneSam',
    ]));

    // Owner-use rails are re-added by applyOwnerIdleRailFilter (#432) — the
    // r281 rail-authority change must not alter that.
    setIdleEnabled(10, false);
    expect(listEnabledNums()).toContain(10);
    expect(listEnabledIdleClipIds()).toContain('IdleInnersceneSam');
  });

  it('C14/C15 remain enabled while C16/C18 rails are off', () => {
    expect(listEnabledNums()).not.toContain(3);
    expect(listEnabledNums()).not.toContain(22);
    expect(listEnabledNums()).not.toContain(23);
    expect(listEnabledIdleClipIds()).toEqual(expect.arrayContaining([
      'IdleMixamoIdle',
      'IdleMixamoStanding',
    ]));
    expect(listEnabledIdleClipIds()).not.toContain('IdleMixamoBreathing');
    expect(listEnabledIdleClipIds()).not.toContain('IdleMixamoHappy');
  });
});
