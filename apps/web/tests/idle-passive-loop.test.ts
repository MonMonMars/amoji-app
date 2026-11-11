import { describe, expect, it } from 'vitest';
import {
  isPassiveIdleClip,
  nextPassiveIdleClip,
  orderPassiveIdleClips,
  PASSIVE_IDLE_LOOP_TEMPLATE,
  PASSIVE_STRETCH_CLIPS,
} from '../lib/idle-passive-loop';
import { orderIdleClips } from '../lib/personality';

describe('passive idle loop (calm-heavy + rare stretch)', () => {
  it('orders calm beats before look, with stretch once at the end', () => {
    const order = orderPassiveIdleClips([...PASSIVE_IDLE_LOOP_TEMPLATE, 'Jump', 'Dance', 'IdleMixamoArmStretch']);
    expect(order[0]).toBe('IdleBreathCalm');
    expect(order).toContain('LookAround');
    expect(order[order.length - 1]).toBe('Relax');
    expect(order.filter((id) => id === 'Relax')).toHaveLength(1);
    expect(order).not.toContain('IdleMixamoArmStretch');
    expect(order).not.toContain('Dance');
    expect(order).not.toContain('Jump');
    // Calm should dominate the cycle (arm-raise was firing too often).
    expect(order.filter((id) => id === 'IdleBreathCalm' || id === 'StandardIdle').length)
      .toBeGreaterThanOrEqual(4);
  });

  it('does not list IdleMixamoArmStretch as a stretch candidate', () => {
    expect(PASSIVE_STRETCH_CLIPS).toEqual(['Relax']);
  });

  it('still builds a short loop if stretch or look is missing', () => {
    const calmOnly = orderPassiveIdleClips(['IdleBreathCalm', 'StandardIdle']);
    expect(calmOnly[0]).toBe('IdleBreathCalm');
    expect(calmOnly).toContain('StandardIdle');
    const withLook = orderPassiveIdleClips(['IdleBreathCalm', 'LookAround']);
    expect(withLook[0]).toBe('IdleBreathCalm');
    expect(withLook).toContain('LookAround');
  });

  it('cycles forever via nextPassiveIdleClip', () => {
    const order = orderPassiveIdleClips([...PASSIVE_IDLE_LOOP_TEMPLATE]);
    const samples = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], n),
    );
    expect(samples[0]).toBe(order[0]);
    expect(samples[8]).toBe(order[0]);
    expect(samples.filter((id) => id === 'Relax').length).toBeLessThanOrEqual(2);
  });

  it('marks only passive clips', () => {
    expect(isPassiveIdleClip('IdleBreathCalm')).toBe(true);
    expect(isPassiveIdleClip('Relax')).toBe(true);
    expect(isPassiveIdleClip('LookAround')).toBe(true);
    expect(isPassiveIdleClip('HelloWave')).toBe(false);
    expect(isPassiveIdleClip('lib_C113')).toBe(false);
  });

  it('orderIdleClips no longer dumps the whole library after calm clips', () => {
    const available = [
      'IdleBreathCalm',
      'StandardIdle',
      'Relax',
      'LookAround',
      'Dance',
      'IdleMixamoHappy',
      'lib_C113',
    ];
    const order = orderIdleClips(available, 'any-character', 'female');
    expect(order[0]).toBe('IdleBreathCalm');
    expect(order[order.length - 1]).toBe('Relax');
    expect(order).not.toContain('Dance');
    expect(order).not.toContain('lib_C113');
  });
});
