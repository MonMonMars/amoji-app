// ─────────────────────────────────────────────────────────────────────────────
// @amoji/engine — Amoji Emotion Engine, umbrella export.
// Text / emotion in → face + body + voice emotion out, personality-driven.
// ─────────────────────────────────────────────────────────────────────────────

export { Amoji } from './amoji.js';
export type { AmojiOptions, SaidResult } from './amoji.js';
export { SEED_CHARACTERS, characterById, pickWeighted } from './characters.js';
export type { CharacterConfig, IdleEmotionWeight } from './characters.js';
export {
  NullBodyDriver,
  NullVoiceDriver,
  NEUTRAL_PROSODY,
  prosodyForEmotion,
  gaitHintForEmotion,
} from './drivers.js';
export type { BodyDriver, FaceHandle, VoiceDriver, VoiceProsody, GaitHint } from './drivers.js';
export { AIGF_FORMAT, AIGF_VERSION, parseAigf, characterFromAigf, loadAigfCharacter } from './aigf.js';
export type { AigfCard } from './aigf.js';
export { analyzeText, EmotionEngine, CATALOG } from '@amoji/emotion-core';
export type { EmotionId, EmotionFrame, EmotionConfig } from '@amoji/emotion-core';
export { AmojiFace, HttpDriver, UnitreeDriver, paramsForEmotion, paramsForText } from '@amoji/robot-face';
