// VRMA rest-hips scale guard.
//
// `createVRMAnimationClip` (from @pixiv/three-vrm-animation) normalizes every
// hips translation key with
//
//   scale = humanoid.normalizedRestPose.hips.position[1]
//         / vrmAnimation.restHipsPosition.y
//
// (see three-vrm-animation 3.5.5, createVRMAnimationHumanoidTracks). When the
// source .vrma's own rest hips Y is zero or negative, that scale is zero or
// NEGATIVE: every hips translation key is mirrored on X/Z and inverted on Y.
// The library warns about it ("might violate the VRM T-pose ... rest hips
// position is approximately zero or below") but still builds the clip.
//
// 15 shipped clips trip the warning. Idle clips do not show it because
// CompanionCanvas pins their hips/legs to the rig rest pose, but the dance
// clips that free the feet (Dance, lib_C61/C62/C110/C125/C126/C127) hand the
// mirrored/inverted hips travel straight to the mixer.
//
// Clamping the divisor to a tiny positive epsilon does NOT fix this: it turns
// the scale into a huge POSITIVE number (e.g. 0.7956 / 1e-3 = 795) and blows
// the hip travel up. The app already re-anchors the hips track onto the rig's
// rest height after clip creation (rebaseClipHips), so the only property that
// must survive is the SIGN and relative shape. Treating such a clip as
// already normalized (scale 1) keeps its authored relative motion and is a
// no-op for every healthy clip, whose real rest hips Y is far above the
// threshold.

import type { VRMHumanoid } from '@pixiv/three-vrm';

/** Same threshold the loader's own warning uses (rest hips Y below 1e-3). */
export const MIN_REST_HIPS_Y = 1e-3;

/**
 * The model's own normalized rest hips height — exactly the numerator
 * createVRMAnimationClip divides by. Falls back to 1 for a rig without a
 * usable hips entry.
 */
export function humanoidRestHipsY(humanoid: VRMHumanoid): number {
  const y = humanoid.normalizedRestPose.hips?.position?.[1];
  return Number.isFinite(y) && (y as number) > MIN_REST_HIPS_Y ? (y as number) : 1;
}

/**
 * The rest hips Y to feed the clip factory. Healthy values pass through
 * untouched; zero/negative/absurdly-small values fall back to the model's own
 * normalized rest hips height, which makes the scale exactly 1.
 */
export function saneRestHipsY(restY: number, humanoidY: number): number {
  if (Number.isFinite(restY) && restY > MIN_REST_HIPS_Y) return restY;
  return Number.isFinite(humanoidY) && humanoidY > MIN_REST_HIPS_Y ? humanoidY : 1;
}

/**
 * Rewrite `anim.restHipsPosition.y` when its value would give the clip
 * factory a negative (or explosively large) scale. Returns true when it
 * changed something. Must run BEFORE createVRMAnimationClip.
 */
export function sanitizeClipHipsScale(
  anim: { restHipsPosition: { y: number } },
  humanoidY: number,
): boolean {
  const next = saneRestHipsY(anim.restHipsPosition.y, humanoidY);
  if (next === anim.restHipsPosition.y) return false;
  anim.restHipsPosition.y = next;
  return true;
}
