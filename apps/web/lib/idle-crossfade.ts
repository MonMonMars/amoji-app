/** Crossfade timing when the user pins a new idle (#N) on chat. */
export const IDLE_PIN_CROSSFADE_S = 0.85;

/**
 * How long to defer foot-plant IK after an idle A→B mixer crossfade starts.
 * Must cover the mixer fade so plantFeet / thigh-unblend do not fight it.
 */
export const IDLE_SWAP_LEG_BLEND_S = 0.85;

/**
 * Manual bone ease during idle A→B — UPPER BODY ONLY.
 * Pixel: blending hips/legs here on top of AnimationMixer.crossFadeTo made
 * the legs shake (double write). Legs stay on the mixer alone; plantFeet
 * stays off for IDLE_SWAP_LEG_BLEND_S so IK does not tug mid-fade.
 */
export const IDLE_SWAP_BLEND_BONES = [
  'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'rightShoulder',
  'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
  'leftHand', 'rightHand',
] as const;

export function idleSwapBlendActive(nowMs: number, blendEndMs: number): boolean {
  return blendEndMs > nowMs;
}

/**
 * Scale poke / procedural additives while an idle A→B bone crossfade runs,
 * so opposite-direction poke recipes do not stack on top of the clip handover.
 */
export function idleCrossfadeAdditiveScale(nowMs: number, blendEndMs: number): number {
  if (!idleSwapBlendActive(nowMs, blendEndMs)) return 1;
  const remain = Math.max(0, blendEndMs - nowMs);
  const u = Math.min(1, remain / (IDLE_SWAP_LEG_BLEND_S * 1000));
  return 0.22 + 0.78 * (1 - u);
}
