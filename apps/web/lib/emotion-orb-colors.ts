import type { EmotionFrame } from '@amoji/emotion-core';
import type { MoodId } from './companion';

/** Base orb tint per coarse mood — red is angry-only; excited = yellow/orange; calm = green/blue. */
export const ORB_MOOD_RGB: Record<MoodId, [number, number, number]> = {
  angry: [255, 88, 82],
  joy: [255, 204, 58],
  surprised: [255, 158, 52],
  sad: [88, 148, 255],
  relaxed: [98, 228, 148],
  neutral: [108, 198, 188],
};

const CALM_WARM_RGB: [number, number, number] = [92, 214, 138];
const CALM_COOL_RGB: [number, number, number] = [86, 158, 248];
const EXCITED_YELLOW: [number, number, number] = [255, 204, 58];
const EXCITED_ORANGE: [number, number, number] = [255, 158, 52];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}

/** True when RGB is the angry-only red (high R, muted G/B — not yellow/orange excited). */
export function isAngryOrbRed(rgb: [number, number, number]): boolean {
  const [r, g, b] = rgb;
  return r > 200 && g < 130 && b < 130;
}

/**
 * Resolve the orb base colour from face mood + engine valence/arousal.
 * Character accent is intentionally ignored — pink/red accents must not tint the ball.
 */
export function orbBaseRgb(mood: MoodId, frame: EmotionFrame | null): [number, number, number] {
  if (mood !== 'neutral') return ORB_MOOD_RGB[mood];

  if (!frame) return ORB_MOOD_RGB.neutral;

  const { valence, arousal } = frame;
  if (arousal > 0.38 && valence > 0.15) {
    const t = Math.min(1, ((arousal - 0.38) / 0.45) * Math.min(1, valence + 0.35));
    return lerpRgb(EXCITED_YELLOW, EXCITED_ORANGE, t);
  }

  return valence >= 0 ? CALM_WARM_RGB : CALM_COOL_RGB;
}
