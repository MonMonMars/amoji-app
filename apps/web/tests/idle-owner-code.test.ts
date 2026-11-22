import { afterEach, describe, expect, it } from 'vitest';
import {
  idleOwnerCodeAliases,
  resolveIdleOwnerCode,
} from '../lib/idle-owner-code';
import { parseOwnerPickerNotesForIdle } from '../lib/owner-picker-notes';
import {
  forgetOwnerPickerDecisionCache,
  OWNER_PICKER_NOTES_KEY,
  ownerIdleClipDeleted,
} from '../lib/owner-picker-decisions';

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
});

describe('idle owner code bridge (ID### ↔ C## ↔ clipId)', () => {
  it('resolves the four owner 採用 Mixamo rows in every key-space', () => {
    expect(resolveIdleOwnerCode('ID126')).toMatchObject({ cId: 'C14', clipId: 'IdleMixamoIdle', libNum: 126 });
    expect(resolveIdleOwnerCode('C14')).toMatchObject({ code: 'ID126', clipId: 'IdleMixamoIdle' });
    expect(resolveIdleOwnerCode('IdleMixamoIdle')).toMatchObject({ code: 'ID126', cId: 'C14' });

    expect(resolveIdleOwnerCode('ID050')).toMatchObject({ cId: 'C15', clipId: 'IdleMixamoStanding' });
    expect(resolveIdleOwnerCode('C15')).toMatchObject({ code: 'ID050' });

    expect(resolveIdleOwnerCode('ID040')).toMatchObject({ cId: 'C16', clipId: 'IdleMixamoBreathing' });
    expect(resolveIdleOwnerCode('C16')).toMatchObject({ code: 'ID040' });

    expect(resolveIdleOwnerCode('ID041')).toMatchObject({ cId: 'C18', clipId: 'IdleMixamoHappy' });
    expect(resolveIdleOwnerCode('C18')).toMatchObject({ code: 'ID041' });
  });

  it('accepts library refs and rejects rail keys / unknown values', () => {
    expect(resolveIdleOwnerCode('lib#40')?.clipId).toBe('IdleMixamoBreathing');
    expect(resolveIdleOwnerCode('motion:C14')?.clipId).toBe('IdleMixamoIdle');
    expect(resolveIdleOwnerCode('lib-IdleMixamoHappy')?.clipId).toBe('IdleMixamoHappy');
    expect(resolveIdleOwnerCode('rail-22-IdleMixamoHappy')?.clipId).toBe('IdleMixamoHappy');
    expect(resolveIdleOwnerCode('ID-R22')).toBeUndefined();
    expect(resolveIdleOwnerCode('nope')).toBeUndefined();
  });

  it('returns equivalent aliases for decision maps', () => {
    expect(idleOwnerCodeAliases('ID126')).toEqual(expect.arrayContaining([
      'ID126',
      'IdleMixamoIdle',
      'lib#126',
      'C14',
    ]));
  });
});

describe('owner picker notes bridge for idle rows', () => {
  it('maps ID### / C## / rail-row ids to clipIds and rail numbers', () => {
    const parsed = parseOwnerPickerNotesForIdle({
      items: [
        { id: 'lib-IdleMixamoIdle', domainCode: 'ID126', ref: 'apps/web/lib/idle-library.ts', decision: 'use' },
        { id: 'lib-IdleMixamoHappy', domainCode: 'ID041', ref: 'apps/web/lib/idle-library.ts', decision: 'delete' },
        { id: 'rail-3-IdleMixamoBreathing', domainCode: 'ID-R03', ref: 'apps/web/lib/idle-curated-rail.ts', decision: 'delete' },
        { id: 'lib-IdleMixamoStanding', domainCode: 'C15', ref: 'apps/web/lib/idle-library.ts', decision: 'use' },
      ],
    });
    expect(parsed?.useClipIds).toEqual(expect.arrayContaining(['IdleMixamoIdle', 'IdleMixamoStanding']));
    expect(parsed?.deleteClipIds).toContain('IdleMixamoHappy');
    expect(parsed?.deleteRailNums).toEqual([3]);
  });

  it('does not mistake a performance-motion C112 tag for idle lib_C112', () => {
    const parsed = parseOwnerPickerNotesForIdle({
      items: [
        { id: 'perf-motion-C112', domainCode: 'C112', prefix: 'ID', ref: 'apps/web/lib/performance-motion.ts', decision: 'delete' },
      ],
    });
    expect(parsed?.deleteClipIds).toEqual([]);
  });

  it('feeds a notes delete of ID126 into ownerIdleClipDeleted', () => {
    mockStorage().set(OWNER_PICKER_NOTES_KEY, JSON.stringify({
      items: [
        { id: 'lib-IdleMixamoIdle', domainCode: 'ID126', ref: 'apps/web/lib/idle-library.ts', decision: 'delete' },
      ],
    }));
    forgetOwnerPickerDecisionCache();
    expect(ownerIdleClipDeleted('IdleMixamoIdle')).toBe(true);
    expect(ownerIdleClipDeleted('IdleMixamoStanding')).toBe(false);
  });
});
