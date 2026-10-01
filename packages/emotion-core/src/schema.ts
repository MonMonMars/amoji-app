export const EMOTION_IDS = ['joy','sadness','anger','fear','disgust','surprise','neutral','love','embarrassment','pride','shame','excitement','contentment','boredom','confusion','jealousy','guilt','relief','contempt'] as const;
export type EmotionId = (typeof EMOTION_IDS)[number];

export const FACE_PARAM_NAMES = ['browInnerUp','browOuterUp','browDown','eyeWide','eyeSquint','lidClosure','mouthSmile','mouthFrown','mouthOpen','mouthStretch','mouthPucker','jawDrop','cheekRaise','noseWrinkle','lipPress','blink'] as const;
export type FaceParamName = (typeof FACE_PARAM_NAMES)[number];

export const BODY_PARAM_NAMES = ['breath','leanForward','leanSide','headPitch','headRoll','headYaw','shoulderUp','gestureReach','gestureEnergy'] as const;
export type BodyParamName = (typeof BODY_PARAM_NAMES)[number];

export type FaceParams = Record<FaceParamName, number>; // each ∈ [0,1]
export type BodyParams = Record<BodyParamName, number>; // each ∈ [-1,1]

export interface Gaze { x: number; y: number } // each ∈ [-1,1]

export interface EmotionFrame {
  face: FaceParams;
  body: BodyParams;
  valence: number; // ∈ [-1,1]
  arousal: number; // ∈ [-1,1]
  gaze: Gaze;
  idle: boolean;
  t: number; // engine time ms
}

export interface EmotionConfig {
  blendTimeMs: number;  // smoothing time constant
  idleAfterMs: number;  // no-input → idle
  saccadeMinMs: number; // fastest saccade interval (high arousal)
  saccadeMaxMs: number; // slowest saccade interval (low arousal)
  intensity: number;    // global multiplier ∈ [0,1]
}

export interface EmotionInput {
  lexicon?: Partial<Record<EmotionId, number>>; // utterance analysis
  llmTags?: Partial<Record<EmotionId, number>>; // model-declared tags
}
