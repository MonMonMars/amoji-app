import { describe, expect, it } from 'vitest';
import {
  isPassiveIdleClip,
  nextPassiveIdleClip,
  orderPassiveIdleClips,
  PASSIVE_IDLE_LOOP_TEMPLATE,
  PASSIVE_LOOK_CLIPS,
  PASSIVE_STRETCH_CLIPS,
} from '../lib/idle-passive-loop';
import { orderIdleClips } from '../lib/personality';

describe('passive idle loop (single static calm stand v5)', () => {
  it('orders one upright RPM stand only — no F/M A→B, look, or stretch', () => {
    const order = orderPassiveIdleClips([
      ...PASSIVE_IDLE_LOOP_TEMPLATE,
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
    expect(order).toEqual(['IdleRpmFStanding001']);
    expect(order).not.toContain('IdleRpmMStanding001');
    expect(order).not.toContain('IdleSassy');
    expect(order).not.toContain('IdleBreathCalm');
    expect(order).not.toContain('Dance');
  });

  it('keeps stretch / look candidate lists empty for upright-only defaults', () => {
    expect(PASSIVE_STRETCH_CLIPS).toEqual([]);
    expect(PASSIVE_LOOK_CLIPS).toEqual([]);
  });

  it('still builds a single-clip loop from available upright stand', () => {
    expect(orderPassiveIdleClips(['IdleRpmFStanding001', 'IdleRpmMStanding001']))
      .toEqual(['IdleRpmFStanding001']);
  });

  it('cycles forever via nextPassiveIdleClip on the same stand', () => {
    const samples = [0, 1, 8, 9].map((n) =>
      nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], n),
    );
    expect(samples.every((id) => id === 'IdleRpmFStanding001')).toBe(true);
  });

  it('marks only the single passive upright clip', () => {
    expect(isPassiveIdleClip('IdleRpmFStanding001')).toBe(true);
    expect(isPassiveIdleClip('IdleRpmMStanding001')).toBe(false);
    expect(isPassiveIdleClip('IdleSassy')).toBe(false);
    expect(isPassiveIdleClip('IdleBreathCalm')).toBe(false);
  });

  it('orderIdleClips no longer dumps the whole library after calm clips', () => {
    const order = orderIdleClips([
      'IdleRpmFStanding001',
      'IdleRpmMStanding001',
      'Dance',
      'lib_C113',
    ], 'any-character', 'female');
    expect(order).toEqual(['IdleRpmFStanding001']);
  });
});
