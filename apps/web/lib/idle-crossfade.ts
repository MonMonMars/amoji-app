/** Crossfade timing when the user pins a new idle (#N) on chat. */
export const IDLE_PIN_CROSSFADE_S = 0.45;

/** Upper + leg slerp while mixer cross-fades idle VRMAs (avoids IK fighting the blend). */
export const IDLE_SWAP_LEG_BLEND_S = 0.45;

/** Humanoid bones eased during an idle A→B swap (includes legs; entry blend omits legs). */
export const IDLE_SWAP_BLEND_BONES = [
  'hips',
  'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'rightShoulder',
  'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
  'leftHand', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
] as const;

export function idleSwapBlendActive(nowMs: number, blendEndMs: number): boolean {
  return blendEndMs > nowMs;
}
