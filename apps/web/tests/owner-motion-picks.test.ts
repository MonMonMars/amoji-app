import { afterEach, describe, expect, it } from 'vitest';
import {
  forgetOwnerPickerDecisionCache,
  isOwnerPickerDeleted,
  isOwnerPickerUse,
  ownerIdleClipUse,
  ownerVisibleDemoPhaseButtons,
  OWNER_PICKER_NOTES_KEY,
  prioritizeOwnerUseIdleClips,
} from '../lib/owner-picker-decisions';
import { forgetOwnerPerfPicksCache, ownerListenMvCodes, resetOwnerPerfPicks } from '../lib/owner-perf-picks';
import { forgetIdleEnabledCache, listEnabledNums, resetIdleEnabled } from '../lib/idle-enabled';
import { orderIdleV2VisibleClips } from '../lib/idle-v2-visible';
import { wantedCmaReactionCodes, resetCmaReactionPicks, forgetCmaReactionPickCache } from '../lib/cma-reaction-gallery';
import { recordedPokeClip } from '../lib/voice-clips';

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

afterEach(() => {
  forgetOwnerPickerDecisionCache();
  resetOwnerPerfPicks();
  forgetOwnerPerfPicksCache();
  resetIdleEnabled();
  forgetIdleEnabledCache();
  resetCmaReactionPicks();
  forgetCmaReactionPickCache();
});

describe('owner motion picker ship-set', () => {
  it('ships repo use rails', () => {
    expect(isOwnerPickerUse('ID-R05')).toBe(true);
    expect(ownerIdleClipUse('IdleRpmFStanding001')).toBe(true);
  });

  it('delete CMA via browser overlay', () => {
    mockStorage().set(OWNER_PICKER_NOTES_KEY, JSON.stringify({
      items: [{ id: 'CMA00350', decision: 'delete' }],
    }));
    forgetOwnerPickerDecisionCache();
    expect(isOwnerPickerDeleted('CMA00350')).toBe(true);
    resetCmaReactionPicks();
    forgetCmaReactionPickCache();
    expect(wantedCmaReactionCodes()).not.toContain('CMA00350');
    expect(recordedPokeClip('female', 'torso')).not.toMatch(/CMA00350/);
  });

  it('prioritizes use idle clips', () => {
    mockStorage();
    forgetIdleEnabledCache();
    expect(orderIdleV2VisibleClips(['IdleInnersceneSam', 'IdleRpmFStanding001'], 'c1')[0]).toBe('IdleRpmFStanding001');
    expect(prioritizeOwnerUseIdleClips(['IdleQuaterniusHuman', 'IdleRpmFStanding001'])[0]).toBe('IdleRpmFStanding001');
  });

  it('enable list includes use rails', () => {
    mockStorage();
    forgetIdleEnabledCache();
    expect(listEnabledNums()).toEqual(expect.arrayContaining([5, 10]));
  });

  it('demo phase delete overlay', () => {
    mockStorage().set(OWNER_PICKER_NOTES_KEY, JSON.stringify({ items: [{ id: 'dance', decision: 'delete' }] }));
    forgetOwnerPickerDecisionCache();
    expect(ownerVisibleDemoPhaseButtons().map((b) => b.id)).not.toContain('dance');
  });

  it('listen MV hydrates', () => {
    mockStorage();
    expect(ownerListenMvCodes()).toContain('MV069');
  });
});