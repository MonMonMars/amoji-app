// ─────────────────────────────────────────────────────────────────────────────
// @amoji/engine — Amoji Emotion Engine, umbrella export.
// Text / emotion in → face + body + voice emotion out, personality-driven.
// ─────────────────────────────────────────────────────────────────────────────

export { Amoji } from './amoji';
export type { AmojiOptions, SaidResult } from './amoji';
export { SEED_CHARACTERS, characterById, pickWeighted } from './characters';
export type { CharacterConfig, IdleEmotionWeight } from './characters';
export {
  NullBodyDriver,
  NullVoiceDriver,
  NEUTRAL_PROSODY,
  prosodyForEmotion,
  gaitHintForEmotion,
} from './drivers';
export type { BodyDriver, FaceHandle, VoiceDriver, VoiceProsody, GaitHint } from './drivers';
export { AIGF_FORMAT, AIGF_VERSION, parseAigf, characterFromAigf, loadAigfCharacter } from './aigf';
export type { AigfCard } from './aigf';
export { analyzeText, EmotionEngine, CATALOG } from '@amoji/emotion-core';
export type { EmotionId, EmotionFrame, EmotionConfig } from '@amoji/emotion-core';
export { AmojiFace, HttpDriver, UnitreeDriver, paramsForEmotion, paramsForText } from '@amoji/robot-face';
