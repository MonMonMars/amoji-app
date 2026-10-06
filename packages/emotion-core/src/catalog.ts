import type { EmotionId, FaceParams, BodyParams } from './schema.js';
import { EMOTION_IDS } from './schema.js';

export interface CatalogEntry {
  face: FaceParams;
  body: BodyParams;
  valence: number;
  arousal: number;
  decayMs: number;
}

const face = (p: Partial<FaceParams>): FaceParams => ({
  browInnerUp: 0, browOuterUp: 0, browDown: 0, eyeWide: 0, eyeSquint: 0, lidClosure: 0,
  mouthSmile: 0, mouthFrown: 0, mouthOpen: 0, mouthStretch: 0, mouthPucker: 0, jawDrop: 0,
  cheekRaise: 0, noseWrinkle: 0, lipPress: 0, blink: 0, ...p,
});

const body = (p: Partial<BodyParams>): BodyParams => ({
  breath: 0.1, leanForward: 0, leanSide: 0, headPitch: 0, headRoll: 0, headYaw: 0,
  shoulderUp: 0, gestureReach: 0, gestureEnergy: 0, ...p,
});

export const CATALOG: Record<EmotionId, CatalogEntry> = {
  joy:           { face: face({ mouthSmile: 0.9, cheekRaise: 0.7, eyeSquint: 0.5, browOuterUp: 0.3 }), body: body({ breath: 0.3, gestureEnergy: 0.4, leanForward: 0.2 }), valence: 0.9, arousal: 0.4, decayMs: 6000 },
  sadness:       { face: face({ mouthFrown: 0.8, browInnerUp: 0.8, lidClosure: 0.4, browOuterUp: 0.2 }), body: body({ breath: 0.15, leanForward: -0.3, headPitch: 0.25, headRoll: 0.1 }), valence: -0.8, arousal: -0.3, decayMs: 9000 },
  anger:         { face: face({ browDown: 0.9, browInnerUp: 0.4, eyeWide: 0.4, lidClosure: 0.2, lipPress: 0.7, noseWrinkle: 0.4 }), body: body({ breath: 0.5, leanForward: 0.4, gestureEnergy: 0.7, headPitch: -0.1 }), valence: -0.8, arousal: 0.8, decayMs: 7000 },
  fear:          { face: face({ eyeWide: 0.9, browInnerUp: 0.9, browOuterUp: 0.5, mouthStretch: 0.5, jawDrop: 0.3 }), body: body({ breath: 0.6, leanForward: -0.4, gestureReach: 0.3 }), valence: -0.7, arousal: 0.8, decayMs: 5000 },
  disgust:       { face: face({ noseWrinkle: 0.9, mouthFrown: 0.5, browDown: 0.5, lipPress: 0.4, lidClosure: 0.3 }), body: body({ breath: 0.3, leanForward: -0.2, headRoll: -0.15 }), valence: -0.6, arousal: 0.2, decayMs: 6000 },
  surprise:      { face: face({ eyeWide: 0.9, browOuterUp: 0.9, browInnerUp: 0.6, jawDrop: 0.6, mouthOpen: 0.4 }), body: body({ breath: 0.4, leanForward: 0.3, gestureReach: 0.4 }), valence: 0.2, arousal: 0.9, decayMs: 3000 },
  neutral:       { face: face({}), body: body({}), valence: 0, arousal: 0, decayMs: 4000 },
  love:          { face: face({ mouthSmile: 0.6, cheekRaise: 0.6, lidClosure: 0.4, browInnerUp: 0.3, mouthPucker: 0.2 }), body: body({ breath: 0.25, leanForward: 0.4, headRoll: 0.2, gestureEnergy: 0.3 }), valence: 0.9, arousal: 0.3, decayMs: 8000 },
  embarrassment: { face: face({ browInnerUp: 0.5, mouthStretch: 0.4, cheekRaise: 0.5, lidClosure: 0.3, browOuterUp: 0.3 }), body: body({ breath: 0.2, headPitch: 0.3, headRoll: 0.2, leanForward: -0.2 }), valence: -0.2, arousal: 0.1, decayMs: 7000 },
  pride:         { face: face({ mouthSmile: 0.7, browOuterUp: 0.3, jawDrop: 0.1, cheekRaise: 0.4 }), body: body({ breath: 0.3, leanForward: 0.3, headPitch: -0.15, gestureEnergy: 0.5 }), valence: 0.8, arousal: 0.4, decayMs: 8000 },
  shame:         { face: face({ browInnerUp: 0.7, lidClosure: 0.5, mouthFrown: 0.3, mouthPucker: 0.2 }), body: body({ breath: 0.15, headPitch: 0.4, leanForward: -0.3, shoulderUp: 0.2 }), valence: -0.7, arousal: -0.2, decayMs: 9000 },
  excitement:    { face: face({ eyeWide: 0.6, mouthOpen: 0.7, mouthSmile: 0.8, browOuterUp: 0.6, jawDrop: 0.3 }), body: body({ breath: 0.6, gestureEnergy: 0.8, gestureReach: 0.6, leanForward: 0.4 }), valence: 0.9, arousal: 0.9, decayMs: 4000 },
  contentment:   { face: face({ mouthSmile: 0.5, lidClosure: 0.3, cheekRaise: 0.3 }), body: body({ breath: 0.2, leanSide: 0.1, headRoll: 0.1 }), valence: 0.7, arousal: -0.1, decayMs: 10000 },
  boredom:       { face: face({ lidClosure: 0.6, mouthStretch: 0.2 }), body: body({ breath: 0.1, headPitch: 0.3, leanForward: -0.4 }), valence: -0.3, arousal: -0.6, decayMs: 8000 },
  confusion:     { face: face({ browInnerUp: 0.6, browDown: 0.3 }), body: body({ breath: 0.2, headRoll: 0.3, headYaw: 0.2 }), valence: -0.1, arousal: 0.1, decayMs: 6000 },
  jealousy:      { face: face({ browDown: 0.6, mouthFrown: 0.4, lidClosure: 0.2, noseWrinkle: 0.2 }), body: body({ breath: 0.3, leanSide: -0.2, headRoll: -0.1 }), valence: -0.5, arousal: 0.4, decayMs: 7000 },
  guilt:         { face: face({ browInnerUp: 0.7, lidClosure: 0.4, mouthPucker: 0.3, mouthFrown: 0.2 }), body: body({ breath: 0.2, headPitch: 0.35, leanForward: -0.2 }), valence: -0.6, arousal: -0.1, decayMs: 9000 },
  relief:        { face: face({ mouthSmile: 0.5, lidClosure: 0.4, browInnerUp: 0.2, browOuterUp: 0.2 }), body: body({ breath: 0.4, leanForward: -0.1, shoulderUp: -0.2 }), valence: 0.6, arousal: -0.4, decayMs: 6000 },
  contempt:      { face: face({ mouthStretch: 0.3, browDown: 0.4, noseWrinkle: 0.2, mouthSmile: 0.15 }), body: body({ breath: 0.25, headRoll: -0.2, leanSide: 0.2 }), valence: -0.4, arousal: 0.2, decayMs: 6000 },
};

export { EMOTION_IDS };
