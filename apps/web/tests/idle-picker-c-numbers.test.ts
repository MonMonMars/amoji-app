import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listIdlePickerRows, idlePickerRowFor } from '../lib/idle-chat-picker';
import { idleByClipId, IDLE_LIBRARY } from '../lib/idle-library';
import { CHAT_IDLE_CURATED, curatedRailByClipId } from '../lib/idle-curated-rail';
import { committedOwnerPickerSelection } from '../lib/owner-picker-ship-set';
import { ownerIdleRailNums } from '../lib/idle-owner-pick';
import { listOwnerOffRailIdleRows } from '../lib/idle-owner-offrail';
import {
  clearIdlePick,
  forgetIdlePickCache,
  idlePickFor,
  resetIdlePicks,
  saveIdlePick,
} from '../lib/idle-pick';
import {
  forgetIdleEnabledCache,
  listEnabledIdleClipIds,
  resetIdleEnabled,
  setIdleEnabled,
} from '../lib/idle-enabled';
import { forgetOwnerOffRailIdleCache } from '../lib/idle-owner-offrail';
import { forgetOwnerPickerDecisionCache } from '../lib/owner-picker-decisions';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

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
  forgetIdlePickCache();
  forgetIdleEnabledCache();
  forgetOwnerOffRailIdleCache();
  forgetOwnerPickerDecisionCache();
});

afterEach(() => {
  resetIdlePicks();
  resetIdleEnabled();
  forgetIdlePickCache();
  forgetIdleEnabledCache();
  forgetOwnerOffRailIdleCache();
  forgetOwnerPickerDecisionCache();
});

describe('in-chat idle picker rows (r282)', () => {
  it('lists every owner 採用 idle clip with its C-code', () => {
    const picker = listIdlePickerRows();
    const ids = new Set(picker.map((r) => r.clipId));
    for (const clipId of committedOwnerPickerSelection().idleClipIds ?? []) {
      expect(ids.has(clipId)).toBe(true);
    }
    // The four Mixamo owner clips keep their C-codes on the row.
    expect(picker.find((r) => r.clipId === 'IdleMixamoIdle')?.label).toBe('C14');
    expect(picker.find((r) => r.clipId === 'IdleMixamoStanding')?.label).toBe('C15');
    expect(picker.find((r) => r.clipId === 'IdleMixamoBreathing')?.label).toBe('C16');
    expect(picker.find((r) => r.clipId === 'IdleMixamoHappy')?.label).toBe('C18');
    // L-coded fallback where the library row has no C-code.
    expect(picker.find((r) => r.clipId === 'IdleInnersceneSam')?.label).toBe('L90');
    expect(picker.find((r) => r.clipId === 'IdleRpmFStanding001')?.label).toBe('L42');
  });

  it('orders rows numerically by C-code and keeps every row playable', () => {
    const labels = listIdlePickerRows().map((r) => r.label);
    const cNums = labels.filter((l) => l.startsWith('C')).map((l) => Number(l.slice(1)));
    expect([...cNums].sort((a, b) => a - b)).toEqual(cNums);
    expect(listIdlePickerRows().every((r) => r.playable)).toBe(true);
  });

  it('pins a picker idle and persists it across a cache reload', () => {
    const row = idlePickerRowFor('lib_C164');
    expect(row?.planted).toBe(true);
    expect(row?.plantedAlternative).toBe(true);

    expect(saveIdlePick('demo-char', 'lib_C164')).toBe('lib_C164');
    expect(idlePickFor('demo-char')).toBe('lib_C164');

    // Simulate a page reload: drop the in-memory cache, re-read localStorage.
    forgetIdlePickCache();
    expect(idlePickFor('demo-char')).toBe('lib_C164');
  });

  it('unpinning clears the pin so normal rotation resumes', () => {
    saveIdlePick('demo-char', 'IdleMixamoHappy');
    expect(idlePickFor('demo-char')).toBe('IdleMixamoHappy');
    clearIdlePick('demo-char');
    forgetIdlePickCache();
    expect(idlePickFor('demo-char')).toBeNull();
    // No pin = chat-auto is free to drive the body again.
    const chat = read('app/chat/page.tsx');
    expect(chat).toContain('clearIdlePick(character.id)');
    expect(chat).toContain('setIdleClip(null)');
  });

  it('the chat page lets a pin override content-driven rotation', () => {
    const chat = read('app/chat/page.tsx');
    expect(chat).toContain('idlePickFor(character.id)');
    expect(chat).toContain('setIdleClip(pin ?? resolveChatAutoIdle(');
    expect(chat).toMatch(/if \(pinnedIdleRef\.current\) return;/);
    expect(chat).toContain('saveIdlePick(character.id, clipId)');
    // The button lives beside the canvas, not inside Settings.
    expect(chat).toContain('<IdlePickerButton');
    expect(chat).toContain('<IdlePickerSheet');
  });

  it('the picker UI is a small thumb-reachable button + safe-area bottom sheet', () => {
    const sheet = read('components/IdlePickerSheet.tsx');
    expect(sheet).toContain('data-testid="idle-picker-button"');
    expect(sheet).toContain('data-testid="idle-picker-sheet"');
    expect(sheet).toContain('env(safe-area-inset-right)');
    expect(sheet).toContain('env(safe-area-inset-bottom');
    expect(sheet).toContain('data-testid="idle-picker-auto"');
    expect(sheet).toContain('data-selected');
    expect(sheet).toContain('overflow-y-auto');
  });
});

describe('seven Shapeweld motions (r282)', () => {
  const NEW = ['lib_C156', 'lib_C157', 'lib_C158', 'lib_C159', 'lib_C160', 'lib_C164', 'lib_C165'];

  it('ships in IDLE_LIBRARY as nums 127–133', () => {
    NEW.forEach((clipId, i) => {
      const row = idleByClipId(clipId);
      expect(row, clipId).toBeTruthy();
      expect(row!.num).toBe(127 + i);
      expect(row!.cId).toBe(`C${clipId.replace('lib_C', '')}`);
      expect(row!.playable).toBe(true);
      expect(row!.defaultEnabled).toBe(false);
    });
    // Feet-planted rows are explicitly flagged.
    expect(idleByClipId('lib_C164')!.planted).toBe(true);
    expect(idleByClipId('lib_C165')!.planted).toBe(true);
    expect(idleByClipId('lib_C156')!.planted).toBe(false);
  });

  it('appears ONLY in the picker — never on a curated rail', () => {
    expect(CHAT_IDLE_CURATED).toHaveLength(39);
    for (const clipId of NEW) {
      expect(curatedRailByClipId(clipId)).toBeUndefined();
      expect(listIdlePickerRows().some((r) => r.clipId === clipId)).toBe(true);
    }
    // And the curated rail membership itself did not grow.
    expect(IDLE_LIBRARY.filter((e) => e.num >= 127).map((e) => e.clipId)).toEqual(NEW);
  });
});

describe('r281 rail authority still holds (r282 regression guard)', () => {
  it('keeps the owner ship-set rails at [4,5,10]', () => {
    expect(ownerIdleRailNums()).toEqual([4, 5, 10]);
  });

  it('rail OFF still wins over the owner 採用 list for C16/C18', () => {
    // Turn the C16 rail (#3) and both C18 rails (#22/#23) off.
    setIdleEnabled(3, false);
    setIdleEnabled(22, false);
    setIdleEnabled(23, false);
    const enabled = listEnabledIdleClipIds();
    expect(enabled).not.toContain('IdleMixamoBreathing');
    expect(enabled).not.toContain('IdleMixamoHappy');
    // C14/C15 stay switchable off-rail rows, default ON.
    expect(listOwnerOffRailIdleRows().map((r) => r.label)).toEqual(['C14', 'C15']);
    expect(enabled).toEqual(expect.arrayContaining(['IdleMixamoIdle', 'IdleMixamoStanding']));
  });

  it('the new picker rows are never auto-rotated in (no promotion)', () => {
    const enabled = listEnabledIdleClipIds();
    for (const clipId of ['lib_C156', 'lib_C164', 'lib_C165']) {
      expect(enabled).not.toContain(clipId);
    }
  });
});
