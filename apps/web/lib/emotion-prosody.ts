/** Emotion → Edge/synth prosody deltas.
 *  Shared by voice.ts so mild LLM emotionHints swing gently and strong
 *  tags (0.7–1.0) actually lift/sink speech. Laughs stay SFX-only.
 */

export type ProsodyDelta = { rate: number; pitch: number; vol: number };

/**
 * Emotion → SSML prosody for the neural path (deltas: rate/pitch fraction,
 * volume dB). Range stays inside what Edge voices still sound human.
 */
export const NEURAL_PROSODY: Record<string, ProsodyDelta> = {
  joy: { rate: 0.15, pitch: 0.16, vol: 0.16 },
  excitement: { rate: 0.24, pitch: 0.2, vol: 0.3 },
  love: { rate: -0.09, pitch: 0.07, vol: -0.08 },
  contentment: { rate: -0.1, pitch: 0.02, vol: -0.14 },
  relief: { rate: -0.08, pitch: 0.02, vol: -0.14 },
  sadness: { rate: -0.15, pitch: -0.12, vol: -0.32 },
  shame: { rate: -0.16, pitch: -0.08, vol: -0.3 },
  guilt: { rate: -0.14, pitch: -0.06, vol: -0.28 },
  boredom: { rate: -0.13, pitch: -0.05, vol: -0.24 },
  anger: { rate: 0.12, pitch: -0.08, vol: 0.32 },
  contempt: { rate: -0.06, pitch: -0.06, vol: 0.04 },
  disgust: { rate: 0.02, pitch: -0.07, vol: 0.1 },
  fear: { rate: 0.17, pitch: 0.16, vol: -0.1 },
  surprise: { rate: 0.14, pitch: 0.3, vol: 0.24 },
  embarrassment: { rate: -0.07, pitch: 0.08, vol: -0.14 },
  pride: { rate: -0.02, pitch: 0.1, vol: 0.1 },
  jealousy: { rate: -0.05, pitch: -0.05, vol: -0.1 },
  confusion: { rate: -0.08, pitch: 0.08, vol: -0.13 },
  neutral: { rate: 0, pitch: 0, vol: 0 },
};

/** Soft moods: keep mid-intensity swings gentle (no squeaky cheer). */
const SOFT_MOODS = new Set([
  'sadness', 'shame', 'guilt', 'love', 'contentment', 'relief', 'embarrassment',
]);

/**
 * Map an emotionHints intensity (0..1) onto a prosody multiplier.
 * Dominant cutoff in fillers is ~0.35; below that we still speak with a
 * mild floor so quiet feelings are not flat-neutral.
 */
export function emotionIntensityScale(value: number): number {
  const v = Number.isFinite(value) ? value : 0;
  if (v <= 0.2) return 0.35;
  // 0.2 → 0.35, 1.0 → 1.0
  return Math.min(1, Math.max(0.35, 0.35 + ((v - 0.2) * 0.65) / 0.8));
}

/** Scaled prosody for speakEdge rateDelta/pitchDelta/volumeDelta. */
export function emotionProsody(emotion: string, intensity01: number): ProsodyDelta {
  const base = NEURAL_PROSODY[emotion] ?? NEURAL_PROSODY.neutral!;
  let s = emotionIntensityScale(intensity01);
  if (SOFT_MOODS.has(emotion) && s > 0.75) s = 0.75 + (s - 0.75) * 0.5;
  return {
    rate: base.rate * s,
    pitch: base.pitch * s,
    vol: base.vol * s,
  };
}
