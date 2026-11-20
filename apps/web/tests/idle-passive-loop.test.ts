import { afterEach, describe, expect, it } from 'vitest';
import {
  isPassiveIdleClip,
  nextPassiveIdleClip,
  orderPassiveIdleClips,
  PASSIVE_IDLE_LOOP_TEMPLATE,
  PASSIVE_LOOK_CLIPS,
  PASSIVE_STRETCH_CLIPS,
  resolvePassiveBodyIdleClip,
} from '../lib/idle-passive-loop';
import { forgetIdlePickCache, resetIdlePicks, saveIdlePick } from '../lib/idle-pick';
import { DEFAULT_IDLE_CLIP_ID } from '../lib/idle-retired';
import { orderIdleClips } from '../lib/personality';

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
  resetIdlePicks();
  forgetIdlePickCache();
});

describe('passive idle loop (single near-still stand v6)', () => {
  it('orders one Quaternius stand only — no RPM F/M, look, or stretch', () => {
    const order = orderPassiveIdleClips([
      ...PASSIVE_IDLE_LOOP_TEMPLATE,
      'IdleRpmFStanding001',
      'IdleRpmMStanding001',
      'Jump',
      'Dance',
      'IdleMixamoArmStretch',
      'IdleRpmFVar003',
      'IdleRpmMVar002',
      'IdleMixamoBreathing',
      'IdleInnersceneSam',
      'IdleRpmFVar001',
    ]);
    expect(order).toEqual(['IdleInnersceneSam']);
    expect(order).not.toContain('IdleRpmFStanding001');
    expect(order).not.toContain('IdleRpmMStanding001');
    expect(order).not.toContain('IdleSassy');
    expect(order).not.toContain('IdleBreathCalm');
    expect(order).not.toContain('Dance');
  });

  it('keeps stretch / look candidate lists empty for upright-only defaults', () => {
    expect(PASSIVE_STRETCH_CLIPS).toEqual([]);
    expect(PASSIVE_LOOK_CLIPS).toEqual([]);
  });

  it('still builds a single-clip loop from best upright stand', () => {
    expect(orderPassiveIdleClips([DEFAULT_IDLE_CLIP_ID, 'IdleInnersceneSam']))
      .toEqual(['IdleInnersceneSam']);
    expect(orderPassiveIdleClips([DEFAULT_IDLE_CLIP_ID, 'IdleRpmFStanding001']))
      .toEqual([DEFAULT_IDLE_CLIP_ID]);
  });

  it('cycles forever via nextPassiveIdleClip on the same stand', () => {
    const samples = [0, 1, 8, 9].map((n) =>
      nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], n),
    );
    expect(samples.every((id) => id === 'IdleInnersceneSam')).toBe(true);
  });

  it('marks only the single passive upright clip', () => {
    expect(isPassiveIdleClip('IdleInnersceneSam')).toBe(true);
    expect(isPassiveIdleClip(DEFAULT_IDLE_CLIP_ID)).toBe(true);
    expect(isPassiveIdleClip('IdleRpmFStanding001')).toBe(true);
    expect(isPassiveIdleClip('IdleRpmMStanding001')).toBe(true);
    expect(isPassiveIdleClip('IdleSassy')).toBe(false);
    expect(isPassiveIdleClip('IdleBreathCalm')).toBe(false);
  });

  it('owner per-character pin wins over Quaternius passive template', () => {
    mockStorage();
    saveIdlePick('a01-shino', 'IdleRpmMStanding001');
    expect(
      orderPassiveIdleClips([...PASSIVE_IDLE_LOOP_TEMPLATE, 'IdleRpmMStanding001'], 'a01-shino'),
    ).toEqual(['IdleRpmMStanding001']);
    expect(
      resolvePassiveBodyIdleClip('a01-shino', [...PASSIVE_IDLE_LOOP_TEMPLATE], 99),
    ).toBe('IdleRpmMStanding001');
  });

  it('orderIdleClips no longer dumps the whole library after calm clips', () => {
    const order = orderIdleClips([
      DEFAULT_IDLE_CLIP_ID,
      'IdleRpmFStanding001',
      'Dance',
      'lib_C113',
    ], 'any-character', 'female');
    expect([DEFAULT_IDLE_CLIP_ID,'IdleRpmFStanding001']).toContain(order[0]);
    expect(order.length).toBeLessThanOrEqual(2);
  });
});
