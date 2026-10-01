import type { EmotionFrame } from '@amoji/emotion-core';

export interface VrmTargets {
  blendShape: { joy: number; angry: number; sorrow: number; fun: number; surprise: number; relaxed: number };
  bones: {
    headPitch: number; headYaw: number; headRoll: number;
    /** arm lowering from T-pose, radians (positive = lower toward body) */
    leftUpperArm: number; rightUpperArm: number;
    /** elbow bend, radians */
    leftLowerArm: number; rightLowerArm: number;
    /** torso pitch from leanForward + breathing, radians */
    spinePitch: number; chestPitch: number;
  };
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** base arm lowering from T-pose, radians (~62 deg) — always applied so the model never T-poses */
export const ARM_DOWN_BASE = 1.08;
/** gentle elbow bend while at rest, radians */
export const ELBOW_BASE = 0.16;

export function mapFrameToVrm(frame: EmotionFrame, intensity = 1): VrmTargets {
  const k = clamp01(intensity);
  const f = frame.face;
  // weighted mix into the six VRM preset blend shapes
  const joyW = clamp01(f.mouthSmile * 0.7 + f.cheekRaise * 0.3);
  const funW = clamp01(f.cheekRaise * 0.5 + f.mouthSmile * 0.5 + f.jawDrop * 0.2);
  const sorrowW = clamp01(f.mouthFrown * 0.7 + f.browInnerUp * 0.3 + f.lidClosure * 0.2);
  const angryW = clamp01(f.browDown * 0.7 + f.lipPress * 0.2 + f.noseWrinkle * 0.2);
  const surpriseW = clamp01(f.eyeWide * 0.7 + f.browOuterUp * 0.3 + f.jawDrop * 0.3);
  const relaxedW = clamp01(f.lidClosure * 0.4 + f.mouthPucker * 0.3 + (1 - f.mouthOpen) * 0.2);

  // ---- body: T-pose fix + idle life (breath, sway, lean) ----
  const tt = frame.t / 1000;
  const arousalN = (frame.arousal + 1) / 2;            // [-1,1] → [0,1]
  const energyN = (frame.body.gestureEnergy + 1) / 2;  // [-1,1] → [0,1]
  const energy = clamp01(0.3 + 0.4 * energyN + 0.3 * arousalN);

  // breathing: slower and deeper when idle
  const breathPeriodSec = frame.idle ? 4.4 : 3.0;
  const breathPhase = Math.sin((2 * Math.PI * tt) / breathPeriodSec); // [-1,1]
  const breathDepth = 0.5 + 0.5 * clamp(frame.body.breath, -1, 1);

  // slow weight-shift sway, phase-offset per side so shoulders alternate
  const swayL = Math.sin(tt * 0.7) * 0.05 * energy * k;
  const swayR = Math.sin(tt * 0.7 + Math.PI) * 0.05 * energy * k;
  const shoulderLift = frame.body.shoulderUp * 0.3 * k;

  const upperL = clamp(ARM_DOWN_BASE - shoulderLift + swayL + breathPhase * 0.02 * k, 0.15, 1.45);
  const upperR = clamp(ARM_DOWN_BASE - shoulderLift + swayR + breathPhase * 0.02 * k, 0.15, 1.45);
  const lower = clamp(ELBOW_BASE + 0.1 * energy + breathPhase * 0.015 * k, 0.05, 0.6);

  const lean = clamp(frame.body.leanForward, -1, 1);
  const leanSide = clamp(frame.body.leanSide, -1, 1);
  const spinePitch = clamp(lean * 0.12 * k + breathPhase * 0.012 * breathDepth * k, -0.2, 0.2);
  const chestPitch = clamp(breathPhase * 0.02 * breathDepth * k + leanSide * 0.04 * k, -0.12, 0.12);

  return {
    blendShape: {
      joy: joyW * k, fun: funW * k, sorrow: sorrowW * k,
      angry: angryW * k, surprise: surpriseW * k, relaxed: relaxedW * k,
    },
    bones: {
      headPitch: clamp(frame.body.headPitch + frame.gaze.y * 0.15, -0.35, 0.35) * k,
      headYaw: clamp(frame.body.headYaw + frame.gaze.x * 0.3, -0.6, 0.6) * k,
      headRoll: clamp(frame.body.headRoll, -0.35, 0.35) * k,
      leftUpperArm: upperL, rightUpperArm: upperR,
      leftLowerArm: lower, rightLowerArm: lower,
      spinePitch, chestPitch,
    },
  };
}
