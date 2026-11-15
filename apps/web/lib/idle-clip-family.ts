/**
 * Idle VRMA author families. A→B mixer crossfades across families
 * (Quaternius ↔ RPM ↔ Mixamo) read as frankenstein mid-poses — especially
 * with hang/soften/shoulder writers stacked on near-still amplitude.
 */

export type IdleClipFamily =
  | 'quaternius'
  | 'rpm'
  | 'mixamo'
  | 'innerscene'
  | 'kaykit'
  | 'lib'
  | 'other';

export function idleClipFamily(clipId: string | null | undefined): IdleClipFamily {
  if (!clipId) return 'other';
  if (/Quaternius/i.test(clipId)) return 'quaternius';
  if (/Rpm/i.test(clipId)) return 'rpm';
  if (/Mixamo/i.test(clipId)) return 'mixamo';
  if (/Innerscene/i.test(clipId)) return 'innerscene';
  if (/Kaykit/i.test(clipId)) return 'kaykit';
  if (/^lib_C/i.test(clipId)) return 'lib';
  return 'other';
}

/** True when a mixer A→B crossfade between these clips stays readable. */
export function idleCrossfadeCompatible(
  fromId: string | null | undefined,
  toId: string | null | undefined,
): boolean {
  if (!fromId || !toId) return true;
  if (fromId === toId) return true;
  return idleClipFamily(fromId) === idleClipFamily(toId);
}

/**
 * Fade seconds for incompatible family swaps — short cut, not a long
 * quaternion smear through broken mid-poses.
 */
export const IDLE_INCOMPAT_CROSSFADE_S = 0.32;
