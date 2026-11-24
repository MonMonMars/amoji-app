import { describe, expect, it } from 'vitest';
import {
  buildExpressionNameMap,
  isBlinkExpression,
  resolveExpressionName,
} from '../lib/vrm/expression-names';
import { BlinkClock } from '../lib/vrm/blink';

/**
 * A VRM 0.x VRoid rig registers custom presets under their authored spelling.
 * VRoid exports surprise as `Surprised` with `presetName: unknown`, so the
 * manager key is PascalCase and the app's lowercase requests silently no-op.
 * 32 of the 43 live roster rigs are VRM 0.x, so this map is the fix for the
 * "surprise flattens the face" bug.
 */
const VRM0_NAMES = [
  'Joy',
  'Angry',
  'Sorrow',
  'Relaxed',
  'Surprised',
  'Blink',
  'Blink_L',
  'Blink_R',
  'A',
  'I',
  'U',
  'E',
  'O',
] as const;

describe('buildExpressionNameMap / resolveExpressionName', () => {
  const map = buildExpressionNameMap(VRM0_NAMES);

  it('resolves lowercase requests to the authored VRM0 spelling', () => {
    expect(resolveExpressionName(map, 'surprised')).toBe('Surprised');
    expect(resolveExpressionName(map, 'blink')).toBe('Blink');
    expect(resolveExpressionName(map, 'blinkLeft')).toBe('Blink_L');
    expect(resolveExpressionName(map, 'blinkRight')).toBe('Blink_R');
    expect(resolveExpressionName(map, 'angry')).toBe('Angry');
    expect(resolveExpressionName(map, 'relaxed')).toBe('Relaxed');
    expect(resolveExpressionName(map, 'aa')).toBeNull();
  });

  it('is case-insensitive in the request itself', () => {
    expect(resolveExpressionName(map, 'SURPRISED')).toBe('Surprised');
    expect(resolveExpressionName(map, 'Blink_l')).toBe('Blink_L');
  });

  it('follows cross-casing aliases when the preset was normalised away', () => {
    // A 0.x loader that mapped the preset may only expose v1 names.
    expect(resolveExpressionName(map, 'happy')).toBe('Joy');
    expect(resolveExpressionName(map, 'sad')).toBe('Sorrow');
    // `Surprise` and `Surprised` both appear in the wild.
    const noSurprised = buildExpressionNameMap(['Joy', 'Surprise']);
    expect(resolveExpressionName(noSurprised, 'surprised')).toBe('Surprise');
  });

  it('returns null for an absent preset instead of guessing a sibling', () => {
    const slim = buildExpressionNameMap(['Joy', 'Blink']);
    expect(resolveExpressionName(slim, 'surprised')).toBeNull();
    expect(resolveExpressionName(slim, 'sorrow')).toBeNull();
  });

  it('keeps the first spelling when a rig lists duplicates with different case', () => {
    const dupes = buildExpressionNameMap(['Blink', 'blink']);
    expect(resolveExpressionName(dupes, 'blink')).toBe('Blink');
  });

  it('identifies every lid-closing channel', () => {
    for (const name of ['blink', 'Blink', 'blinkLeft', 'Blink_L', 'blinkRight', 'blink_r']) {
      expect(isBlinkExpression(name), name).toBe(true);
    }
    expect(isBlinkExpression('happy')).toBe(false);
    expect(isBlinkExpression('aa')).toBe(false);
  });
});

describe('BlinkClock', () => {
  const make = () => new BlinkClock(2.4, 5.0, 0.16, () => 0.5);

  it('waits the deterministic delay, then closes and reopens the lids', () => {
    const clock = make();
    // delay = 2.4 + 0.5 * (5.0 - 2.4) = 3.7 s
    expect(clock.update(3.6)).toBe(0);
    // trigger frame: lids start open, ramp begins next frame
    expect(clock.update(0.2)).toBe(0);
    expect(clock.update(0.08)).toBeCloseTo(1, 6);
    // end of the 0.16 s blink returns to open and re-arms
    expect(clock.update(0.08)).toBe(0);
    expect(clock.update(0.01)).toBe(0);
  });

  it('re-arms on reset without an in-flight blink', () => {
    const clock = make();
    clock.update(3.7); // trigger
    clock.update(0.08); // mid-blink
    clock.reset();
    expect(clock.update(0.08)).toBe(0);
    expect(clock.update(3.5)).toBe(0);
    expect(clock.update(0.2)).toBe(0); // trigger again after a fresh delay
  });

  it('ignores non-finite / negative dt', () => {
    const clock = make();
    expect(clock.update(Number.NaN)).toBe(0);
    expect(clock.update(-1)).toBe(0);
    expect(clock.update(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
