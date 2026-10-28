export { CAM_LERP, LANE, TAG, clampLane, laneX } from './constants';
export { miniGameModelCandidates, resolveMiniGameCompanion } from './companion';
export { GAME_CARDS, gameCardCopy } from './catalog';
export type { GameCardDef } from './catalog';
export { detectActionGame } from './detect';
export { laneCamera, tagCamera } from './camera';
export { expressionFor, resolveGameClip, GAME_CLIP_CANDIDATES } from './anim';
export { controlHint, lineFor, uiCopy } from './lines';
export {
  HOWTO_SRC,
  classifyHostPlatform,
  controlSchemeFor,
  desktopTagAim,
  detectHostPlatform,
  EMPTY_KEYS,
  laneSwipeThreshold,
  tagKeysFromEvent,
} from './platform';
export type { ControlScheme, HostPlatform, PlatformProbe, TagKeyState } from './platform';
export { createLane, stepLane, LANE_IDLE_CMD } from './lane';
export type { LaneCommand, LaneState } from './lane';
export { createTag, stepTag, TAG_IDLE_CMD } from './tag';
export type { TagCommand, TagState } from './tag';
export {
  getMiniGameView,
  isMiniGameActive,
  pickGround,
  publishMiniGameEmotion,
  registerGroundPick,
  requestOpenMiniGame,
  setMiniGameChromeHidden,
  setMiniGameView,
  subscribeMiniGameChrome,
  subscribeMiniGameOpen,
} from './session';
export type { MiniGameEmotionDetail } from './session';
export type {
  ActionGame,
  EmotionHints,
  FaceExpr,
  GameAnim,
  GamePhase,
  MiniEmotionEvent,
  MiniEmotionKind,
  MiniGameView,
} from './types';
export { viewOfLane, viewOfTag } from './view';
