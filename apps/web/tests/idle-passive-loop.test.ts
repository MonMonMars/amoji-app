import { describe, expect, it } from 'vitest';
import {
  isPassiveIdleClip,
  nextPassiveIdleClip,
  orderPassiveIdleClips,
  PASSIVE_IDLE_LOOP_TEMPLATE,
} from '../lib/idle-passive-loop';
import { orderIdleClips } from '../lib/personality';

describe('passive idle loop (relax → stretch → look)', () => {
  it('orders relax, stretch, relax, look when all clips are available', () => {
    const order = orderPassiveIdleClips([...PASSIVE_IDLE_LOOP_TEMPLATE, 'Jump', 'Dance']);
    expect(order).toEqual(['IdleBreathCalm', 'Relax', 'StandardIdle', 'LookAround']);
    expect(order).not.toContain('Dance');
    expect(order).not.toContain('Jump');
  });

  it('still builds a short loop if stretch or look is missing', () => {
    const calmOnly = orderPassiveIdleClips(['IdleBreathCalm', 'StandardIdle']);
    expect(calmOnly).toEqual(['IdleBreathCalm', 'StandardIdle']);
    const withLook = orderPassiveIdleClips(['IdleBreathCalm', 'LookAround']);
    expect(withLook[0]).toBe('IdleBreathCalm');
    expect(withLook).toContain('LookAround');
  });

  it('cycles forever via nextPassiveIdleClip', () => {
    const a = nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], 0);
    const b = nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], 1);
    const c = nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], 2);
    const d = nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], 3);
    const e = nextPassiveIdleClip([...PASSIVE_IDLE_LOOP_TEMPLATE], 4);
    expect([a, b, c, d]).toEqual(['IdleBreathCalm', 'Relax', 'StandardIdle', 'LookAround']);
    expect(e).toBe(a);
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
    expect(order).toEqual(['IdleBreathCalm', 'Relax', 'StandardIdle', 'LookAround']);
    expect(order).not.toContain('Dance');
    expect(order).not.toContain('lib_C113');
  });
});
