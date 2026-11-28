// ─────────────────────────────────────────────────────────────────────────────
// @amoji/robot-face — Amoji Robot Face SDK
// Plug-and-use emotion display for humanoid robots.
//
//   import { AmojiFace, HttpDriver } from '@amoji/robot-face';
//   const face = new AmojiFace({ driver: new HttpDriver('http://ROBOT_IP:8080/api/face') });
//   face.start();
//   face.say('你好！');            // text → emotion analysis → face + speech hook
//   face.setEmotion('joy', 1);    // or drive directly from your robot stack
//
// Two display paths:
//  1. Monitor / phone display  → pass a <canvas> element.
//  2. LED matrix face (Unitree-style) → the driver receives a size×size×3 RGB
//     buffer every frame via showFrame(). Bridge it to your LED hardware
//     (WS2812, Unitree face service, serial, ROS topic…).
//
// Single source of truth: the Amoji web app (apps/web) consumes this exact
// module via a re-export shim — the B2C app and the B2B SDK cannot drift.
// v2: look direction, voice-level lipsync, multi-emotion hint blending,
//     blinks, and the Http/Unitree drivers — all in the package.
// v3 (this file): a first-class expression *state* model. Every emotion in
//     @amoji/emotion-core plus the transient robot states (idle/listening/
//     thinking/speaking/sleeping/greeting) has its own drawable look: eye
//     scale + slant, lid opening, pupil offset/dilation, brow tilt/raise/
//     asymmetry, mouth curve/openness/pucker, blush, and a primary/secondary
//     colour pair. Colours are data: retune FACE_COLOR_PALETTE only. Transitions
//     cross-fade in 160 ms (120–200 ms window) and strong emotions punch in
//     with the same envelope shape as the app's lib/emotion-presentation.ts.
//     Idle blink + gaze drift are clock-derived (no Math.random). Nothing here
//     touches the VRM path.
// ─────────────────────────────────────────────────────────────────────────────
import { analyzeText, EMOTION_IDS } from '@amoji/emotion-core';
import type { EmotionId } from '@amoji/emotion-core';

export { analyzeText, EMOTION_IDS };
export type { EmotionId };

// ── expression state model ──────────────────────────────────────────────────
// A 2D face draws every shape, so unlike the shipped VRM rigs (6 presets,
// 5 visemes, no brow/lip/cheek morphs) it can express all 19 catalog
// emotions. The table below is the single place to tune a look.

export const TRANSIENT_FACE_STATES = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'sleeping',
  'greeting',
] as const;

export type TransientFaceState = (typeof TRANSIENT_FACE_STATES)[number];
export type ExpressionState = EmotionId | TransientFaceState;

/** All drawable states — transient robot states first, then catalog emotions. */
export const EXPRESSION_STATES: readonly ExpressionState[] = [
  ...TRANSIENT_FACE_STATES,
  ...EMOTION_IDS,
];

export interface FaceParams {
  eyeW: number;   // eye width scale
  eyeH: number;   // eye openness 0..1.2
  pupil: number;  // pupil dilation 0..1
  smile: number;  // mouth curve -1 .. 1
  open: number;   // mouth openness 0..1
  r: number; g: number; b: number; // glow color
  bounce: number; // idle bob amplitude 0..1
  // v3 expression channels. Optional so a hand-built FaceParams object from an
  // older SDK version still compiles; every renderer resolves them to a
  // default before drawing.
  eyeSlant?: number;   // −1 outer corner down .. 1 outer corner up
  pupilX?: number;     // pupil offset −1 .. 1
  pupilY?: number;     // pupil offset −1 .. 1
  browTilt?: number;   // −1 inner down (anger) .. 1 inner up (sad/worried)
  browRaise?: number;  // 0 .. 1 both brows up
  browAsym?: number;   // −1 left brow up .. 1 right brow up (confusion)
  pucker?: number;     // 0 .. 1 narrower/rounder mouth
  blush?: number;      // 0 .. 1 cheek tint from the secondary colour
  r2?: number; g2?: number; b2?: number; // secondary colour (pupil/blush)
}

/** Every channel is required once resolved — safe to index and blend. */
export type FaceLook = Required<FaceParams>;

export type FaceRgb = readonly [number, number, number];

export interface FaceColorPair {
  primary: [number, number, number];
  secondary: [number, number, number];
}

// ── the retuning surface ────────────────────────────────────────────────────
// RETUNE THE FACE COLOURS HERE. This is the only record to edit for colour:
// geometry, timing and rendering stay untouched. Every drawable state needs
// one saturated primary (eyes / brows / mouth glow) and one lighter accent
// (pupil core + blush), the two-tone Fluent-Emoji reading.
//
// The six coarse-mood anchors are copied from
// apps/web/lib/emotion-orb-colors.ts `ORB_MOOD_RGB` — the package cannot
// import app code, so apps/web/tests/robot-face-palette.test.ts fails if they
// drift. The thirteen emotions the orb never had get a tint inside the nearest
// family (love/embarrassment rose, fear/periwinkle violet, disgust/jealousy
// green, shame/guilt indigo, boredom/contempt sand) rather than unrelated hex.
export const FACE_COLOR_PALETTE: Record<ExpressionState, FaceColorPair> = {
  // ── transient robot states ────────────────────────────────────────────────
  neutral: { primary: [108, 198, 188], secondary: [255, 255, 255] },
  idle: { primary: [120, 200, 205], secondary: [255, 255, 255] },
  listening: { primary: [130, 210, 255], secondary: [210, 240, 255] },
  thinking: { primary: [160, 170, 220], secondary: [225, 225, 255] },
  speaking: { primary: [150, 225, 225], secondary: [255, 255, 255] },
  sleeping: { primary: [70, 110, 160], secondary: [150, 180, 220] },
  greeting: { primary: [255, 210, 110], secondary: [255, 245, 200] },

  // ── catalog emotions ──────────────────────────────────────────────────────
  joy: { primary: [255, 204, 58], secondary: [255, 240, 190] },
  excitement: { primary: [255, 170, 60], secondary: [255, 230, 170] },
  love: { primary: [255, 120, 170], secondary: [255, 190, 215] },
  contentment: { primary: [98, 228, 148], secondary: [205, 245, 220] },
  pride: { primary: [255, 210, 90], secondary: [255, 240, 180] },
  surprise: { primary: [255, 158, 52], secondary: [255, 225, 175] },
  confusion: { primary: [170, 170, 255], secondary: [225, 225, 255] },
  sadness: { primary: [88, 148, 255], secondary: [190, 215, 255] },
  anger: { primary: [255, 88, 82], secondary: [255, 180, 120] },
  fear: { primary: [170, 120, 255], secondary: [220, 200, 255] },
  disgust: { primary: [150, 190, 90], secondary: [220, 235, 180] },
  embarrassment: { primary: [255, 150, 170], secondary: [255, 205, 215] },
  shame: { primary: [130, 120, 200], secondary: [205, 195, 245] },
  boredom: { primary: [110, 140, 160], secondary: [180, 200, 215] },
  jealousy: { primary: [110, 180, 110], secondary: [200, 235, 190] },
  guilt: { primary: [140, 130, 210], secondary: [210, 200, 245] },
  relief: { primary: [130, 220, 190], secondary: [210, 245, 230] },
  contempt: { primary: [200, 180, 120], secondary: [235, 225, 185] },
};

const neutralPair = FACE_COLOR_PALETTE.neutral;

export const NEUTRAL: FaceLook = {
  eyeW: 1, eyeH: 0.8, eyeSlant: 0, pupil: 0.5, pupilX: 0, pupilY: 0,
  browTilt: 0, browRaise: 0, browAsym: 0,
  smile: 0.15, open: 0.1, pucker: 0, blush: 0,
  r: neutralPair.primary[0], g: neutralPair.primary[1], b: neutralPair.primary[2],
  r2: neutralPair.secondary[0], g2: neutralPair.secondary[1], b2: neutralPair.secondary[2],
  bounce: 0.12,
};

export const FACE_CHANNEL_KEYS = [
  'eyeW', 'eyeH', 'eyeSlant', 'pupil', 'pupilX', 'pupilY',
  'browTilt', 'browRaise', 'browAsym', 'smile', 'open', 'pucker', 'blush',
  'r', 'g', 'b', 'r2', 'g2', 'b2', 'bounce',
] as const satisfies readonly (keyof FaceLook)[];

type FaceChannelKey = (typeof FACE_CHANNEL_KEYS)[number];

/** Valid range per channel. Colours are 0..255; geometry stays unit-scaled. */
export const FACE_CHANNEL_RANGE: Record<FaceChannelKey, readonly [number, number]> = {
  eyeW: [0.2, 2], eyeH: [0, 1.2], eyeSlant: [-1, 1],
  pupil: [0, 1], pupilX: [-1, 1], pupilY: [-1, 1],
  browTilt: [-1, 1], browRaise: [0, 1], browAsym: [-1, 1],
  smile: [-1, 1], open: [0, 1.2], pucker: [0, 1], blush: [0, 1],
  r: [0, 255], g: [0, 255], b: [0, 255],
  r2: [0, 255], g2: [0, 255], b2: [0, 255],
  bounce: [0, 1],
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const clock = (): number =>
  (typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now());
const roundRgb = (v: number): number => Math.round(clamp(v, 0, 255));

/** Resolve optional v3 channels (and any NaN from a caller) into a full look. */
export function resolveFaceParams(p: FaceParams): FaceLook {
  const out = {} as FaceLook;
  for (const key of FACE_CHANNEL_KEYS) {
    const raw = p[key];
    const fallback = NEUTRAL[key];
    out[key] = typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
  }
  return clampFaceLook(out);
}

function clampFaceLook(p: FaceLook): FaceLook {
  const out = {} as FaceLook;
  for (const key of FACE_CHANNEL_KEYS) {
    const raw = p[key];
    const [lo, hi] = FACE_CHANNEL_RANGE[key];
    const v = Number.isFinite(raw) ? raw : NEUTRAL[key];
    out[key] = clamp(v, lo, hi);
  }
  return out;
}

/** Linear cross-fade between two looks. `t` is clamped to 0..1 (NaN → 0). */
export function mixFaceLook(a: FaceLook, b: FaceLook, t: number): FaceLook {
  const u = clamp01(Number.isFinite(t) ? t : 0);
  const out = {} as FaceLook;
  for (const key of FACE_CHANNEL_KEYS) {
    out[key] = a[key] + (b[key] - a[key]) * u;
  }
  return clampFaceLook(out);
}

/** Overshoot a look away from neutral (punch gain can exceed 1). */
function applyFaceGain(base: FaceLook, gain: number): FaceLook {
  const g = Number.isFinite(gain) ? Math.max(0, gain) : 1;
  const out = {} as FaceLook;
  for (const key of FACE_CHANNEL_KEYS) {
    out[key] = NEUTRAL[key] + (base[key] - NEUTRAL[key]) * g;
  }
  return clampFaceLook(out);
}

/** Public blend of two FaceParams (partial v3 fields resolved first). */
export function blendFaceParams(a: FaceParams, b: FaceParams, t: number): FaceLook {
  return mixFaceLook(resolveFaceParams(a), resolveFaceParams(b), t);
}

// ── the per-state look table ────────────────────────────────────────────────
// Shapes live here; colour comes from FACE_COLOR_PALETTE above so a designer
// retunes one record without touching geometry. Every catalog emotion has a
// row (the old table silently fell through to neutral for eight of them).

const look = (state: ExpressionState, over: Partial<FaceLook>): FaceLook => {
  const { primary, secondary } = FACE_COLOR_PALETTE[state];
  return clampFaceLook({
    ...NEUTRAL,
    ...over,
    r: primary[0], g: primary[1], b: primary[2],
    r2: secondary[0], g2: secondary[1], b2: secondary[2],
  });
};

export const FACE_STATES: Record<ExpressionState, FaceLook> = {
  neutral: NEUTRAL,

  // ── transient robot states ────────────────────────────────────────────────
  idle: look('idle', { eyeH: 0.78, pupil: 0.45, smile: 0.1, bounce: 0.1 }),
  listening: look('listening', {
    eyeH: 0.95, pupil: 0.7, pupilY: -0.1, browRaise: 0.25, smile: 0.2, open: 0.08, bounce: 0.08,
  }),
  thinking: look('thinking', {
    eyeH: 0.5, eyeSlant: 0.15, pupil: 0.6, pupilX: 0.55, pupilY: -0.35,
    browTilt: 0.2, browAsym: 0.6, smile: -0.05, open: 0.06, bounce: 0.05,
  }),
  speaking: look('speaking', {
    eyeH: 0.85, pupil: 0.55, smile: 0.25, open: 0.2, bounce: 0.16,
  }),
  sleeping: look('sleeping', {
    eyeH: 0.06, pupil: 0, smile: 0.05, open: 0.04, bounce: 0.02,
  }),
  greeting: look('greeting', {
    eyeH: 1.05, smile: 0.8, open: 0.25, browRaise: 0.35, blush: 0.18, bounce: 0.5,
  }),

  // ── catalog emotions ──────────────────────────────────────────────────────
  joy: look('joy', {
    eyeH: 1, smile: 1, open: 0.3, browRaise: 0.1, blush: 0.12, bounce: 0.4,
  }),
  excitement: look('excitement', {
    eyeH: 1.1, smile: 1, open: 0.7, browRaise: 0.6, blush: 0.15, pupil: 0.8, bounce: 0.9,
  }),
  love: look('love', {
    eyeH: 0.75, smile: 0.9, open: 0.2, browTilt: 0.25, blush: 0.55, pupil: 0.6, bounce: 0.3,
  }),
  contentment: look('contentment', {
    eyeH: 0.7, smile: 0.6, open: 0.1, browTilt: 0.15, blush: 0.2, pupil: 0.45, bounce: 0.1,
  }),
  pride: look('pride', {
    eyeH: 0.85, smile: 0.8, open: 0.25, browRaise: 0.25, pupilY: -0.15, browTilt: -0.1, bounce: 0.5,
  }),
  surprise: look('surprise', {
    eyeH: 1.2, smile: 0.2, open: 0.8, browRaise: 1, browTilt: 0.15, pupil: 0.75, bounce: 0.5,
  }),
  confusion: look('confusion', {
    eyeH: 0.9, smile: -0.1, open: 0.2, browAsym: 1, browTilt: 0.25, pupilX: 0.4, pupilY: -0.25, bounce: 0.15,
  }),
  sadness: look('sadness', {
    eyeH: 0.45, smile: -0.6, open: 0.1, browTilt: 0.85, pupilY: 0.25, bounce: 0,
  }),
  anger: look('anger', {
    eyeH: 0.5, smile: -0.9, open: 0.2, browTilt: -1, pupil: 0.35, blush: 0.05, bounce: 0.2,
  }),
  fear: look('fear', {
    eyeH: 1.15, smile: -0.3, open: 0.5, browTilt: 0.7, browRaise: 0.9, pupil: 0.8, pupilY: -0.1, bounce: 0.6,
  }),
  disgust: look('disgust', {
    eyeH: 0.55, eyeSlant: -0.15, smile: -0.65, open: 0.08, browTilt: -0.35, browAsym: 0.35, pupil: 0.35, bounce: 0.05,
  }),
  embarrassment: look('embarrassment', {
    eyeH: 0.6, smile: 0.25, open: 0.12, browTilt: 0.45, browAsym: 0.2,
    pupil: 0.55, pupilX: 0.35, pupilY: 0.25, blush: 0.8, bounce: 0.05,
  }),
  shame: look('shame', {
    eyeH: 0.35, smile: -0.35, open: 0.08, browTilt: 0.8, pupil: 0.4,
    pupilX: -0.2, pupilY: 0.45, blush: 0.3, bounce: 0,
  }),
  boredom: look('boredom', {
    eyeH: 0.3, eyeSlant: -0.1, smile: -0.15, open: 0.06, browTilt: 0.1,
    pupil: 0.4, pupilX: 0.5, pupilY: 0.15, bounce: 0.02,
  }),
  jealousy: look('jealousy', {
    eyeH: 0.45, smile: -0.4, open: 0.1, browTilt: -0.5, browAsym: 0.3, pupil: 0.45, blush: 0.1, bounce: 0.15,
  }),
  guilt: look('guilt', {
    eyeH: 0.5, smile: -0.3, open: 0.08, browTilt: 0.75, pupil: 0.45,
    pupilX: -0.25, pupilY: 0.4, blush: 0.22, bounce: 0.02,
  }),
  relief: look('relief', {
    eyeH: 0.5, smile: 0.5, open: 0.12, browTilt: 0.2, browRaise: 0.1, pupil: 0.45, blush: 0.1, bounce: 0.1,
  }),
  contempt: look('contempt', {
    eyeH: 0.55, eyeSlant: 0.2, smile: 0.3, open: 0.08, browTilt: -0.4,
    browAsym: -0.7, pupil: 0.4, bounce: 0.08,
  }),
};

export function isExpressionState(name: string): name is ExpressionState {
  return Object.prototype.hasOwnProperty.call(FACE_STATES, name);
}

/** Unknown names resolve to neutral so a robot stack cannot crash the face. */
export function resolveExpressionState(name: string): ExpressionState {
  return isExpressionState(name) ? name : 'neutral';
}

/** Colour pair for a state (0..255). Every catalog emotion resolves. */
export function faceColorsFor(state: string): FaceColorPair {
  const s = resolveExpressionState(state);
  const p = FACE_STATES[s];
  return {
    primary: [roundRgb(p.r), roundRgb(p.g), roundRgb(p.b)],
    secondary: [roundRgb(p.r2), roundRgb(p.g2), roundRgb(p.b2)],
  };
}

const colorChannel = (v: number, fallback: number): number =>
  Number.isNaN(v) ? fallback : clamp(v, 0, 255);

/**
 * Clamped, NaN-safe linear mix of two colour pairs. `t` is clamped to 0..1
 * (NaN → 0) and every channel is clamped back into 0..255, so a state change
 * can never snap, overflow the gamut, or emit NaN.
 */
export function blendFaceColors(from: FaceColorPair, to: FaceColorPair, t: number): FaceColorPair {
  const u = clamp01(Number.isFinite(t) ? t : 0);
  const mix = (a: number, b: number): number => {
    const av = colorChannel(a, 0);
    const bv = colorChannel(b, 0);
    return Math.round(clamp(av + (bv - av) * u, 0, 255));
  };
  return {
    primary: [
      mix(from.primary[0], to.primary[0]),
      mix(from.primary[1], to.primary[1]),
      mix(from.primary[2], to.primary[2]),
    ],
    secondary: [
      mix(from.secondary[0], to.secondary[0]),
      mix(from.secondary[1], to.secondary[1]),
      mix(from.secondary[2], to.secondary[2]),
    ],
  };
}

// ── emotion → params (kept source-compatible) ───────────────────────────────

export function paramsForEmotion(emotion: string, intensity = 1): FaceParams {
  const state = resolveExpressionState(emotion);
  const k = clamp01(Number.isFinite(intensity) ? intensity : 0);
  return { ...mixFaceLook(NEUTRAL, FACE_STATES[state], k) };
}

/** Dominant-blended face params from weighted emotion hints (top-3 averaged). */
export function paramsForHints(hints: Partial<Record<EmotionId, number>>): FaceParams {
  const entries = (Object.entries(hints) as Array<[string, number | undefined]>)
    .filter(([id]) => isExpressionState(id))
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3);
  let p: FaceLook = NEUTRAL;
  for (const [id, wRaw] of entries) {
    const k = clamp01(Number.isFinite(wRaw) ? (wRaw as number) : 0);
    p = mixFaceLook(p, FACE_STATES[id as ExpressionState], k);
  }
  return { ...p, r: roundRgb(p.r), g: roundRgb(p.g), b: roundRgb(p.b) };
}

export function paramsForText(text: string): FaceParams {
  return paramsForHints(analyzeText(text));
}

// ── live modifiers (look direction + voice lipsync) ─────────────────────────

export interface FaceModifiers {
  /** horizontal gaze −1 (left) .. 1 (right) */
  lookX?: number;
  /** vertical gaze −1 (up) .. 1 (down) */
  lookY?: number;
  /** voice amplitude 0..1 — opens the mouth for real lipsync */
  level?: number;
}

/**
 * Pure: fold live modifiers into render params. Voice level opens the mouth
 * (never closes it below the emotion's own openness) and dilates the pupil
 * slightly — eyes widen a touch while talking.
 */
export function withLookAndVoice(p: FaceParams, m: FaceModifiers = {}): FaceParams {
  const level = clamp(m.level ?? 0, 0, 1);
  return {
    ...p,
    open: Math.max(p.open, level * 0.95),
    pupil: clamp(p.pupil + level * 0.25, 0, 1),
  };
}

// ── mouth motion (speech-driven + deterministic fallback) ───────────────────

/** Cross-fade length for a state change. 160 ms sits inside the 120–200 ms band. */
export const STATE_BLEND_MS = 160;
/** Matched to apps/web/lib/vocal-envelope.ts `smoothMouth` — attack/release. */
export const MOUTH_ATTACK_MS = 45;
export const MOUTH_RELEASE_MS = 110;

/** 0 → 1 eased progress for a state cross-fade. */
export function blendProgress(elapsedMs: number, blendMs = STATE_BLEND_MS): number {
  const span = Math.max(1, Number.isFinite(blendMs) ? blendMs : STATE_BLEND_MS);
  const t = Number.isFinite(elapsedMs) ? clamp01(elapsedMs / span) : 0;
  return smoothstep(t);
}

// ── deterministic idle micro-motion ─────────────────────────────────────────
// A 2D face reads as alive mostly through tiny continuous motion. The gentle
// breathing bob already lives in drawFace (`sin(t * 2.2) * bounce`). These two
// helpers add the motion that was missing or random: a clock-derived blink
// schedule and a subtle idle gaze drift. No Math.random() anywhere — the same
// `nowMs` always yields the same frame, so motion is testable and a recorded
// robot demo replays identically.

export const BLINK_PERIOD_MS = 3600;
export const BLINK_DURATION_MS = 150;
/** First blink lands ~2.1 s after load rather than mid-eye-open. */
const BLINK_OFFSET_MS = 1450;

/** 0 (open) → 1 (closed) → 0 blink amount for a clock-derived schedule. */
export function idleBlinkAmount(nowMs: number): number {
  const t = Number.isFinite(nowMs) ? nowMs : 0;
  const phase = (((t + BLINK_OFFSET_MS) % BLINK_PERIOD_MS) + BLINK_PERIOD_MS) % BLINK_PERIOD_MS;
  if (phase >= BLINK_DURATION_MS) return 0;
  return Math.sin((phase / BLINK_DURATION_MS) * Math.PI);
}

export interface FaceGaze {
  x: number;
  y: number;
}

/** Subtle idle gaze drift, −0.16..0.16 per axis, deterministic from the clock. */
export function idleGazeOffset(nowMs: number): FaceGaze {
  const t = Number.isFinite(nowMs) ? nowMs / 1000 : 0;
  const x = 0.09 * Math.sin(t * 0.37) + 0.045 * Math.sin(t * 0.91 + 1.7);
  const y = 0.055 * Math.sin(t * 0.29 + 0.6) + 0.025 * Math.sin(t * 0.73 + 2.1);
  return { x: clamp(x, -0.16, 0.16), y: clamp(y, -0.16, 0.16) };
}

/**
 * One-pole attack/release smoothing for the mouth. Mirrors
 * `smoothMouth(prev, target, dtMs, 45, 110)` in apps/web/lib/vocal-envelope.ts:
 * the package cannot import app code, so the constants are duplicated here and
 * kept identical by the test suite.
 */
export function smoothMouthLevel(prev: number, target: number, dtMs: number): number {
  const p = clamp01(Number.isFinite(prev) ? prev : 0);
  const t = clamp01(Number.isFinite(target) ? target : 0);
  const tc = t > p ? MOUTH_ATTACK_MS : MOUTH_RELEASE_MS;
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  const alpha = 1 - Math.exp(-dt / Math.max(1, tc));
  return clamp01(p + (t - p) * alpha);
}

/**
 * Deterministic talking fallback for when no audio analyser is available
 * (cross-origin gTTS / speechSynthesis). Slow pseudo-syllable oscillation,
 * bounded 0.12..0.42 — visible motion, never a flapping mouth.
 */
export function fallbackMouthLevel(nowMs: number): number {
  const t = Number.isFinite(nowMs) ? nowMs : 0;
  return clamp01(0.27 + 0.15 * Math.sin((t / 1000) * Math.PI * 2 * 3.1));
}

/**
 * Mouth target for a frame. Real amplitude wins; while speaking without an
 * analyser a deterministic fallback keeps the face alive; otherwise closed.
 */
export function talkingMouthTarget(
  state: ExpressionState | string,
  level: number,
  nowMs: number,
): number {
  const l = clamp01(Number.isFinite(level) ? level : 0);
  if (l > 0.02) return l;
  return resolveExpressionState(state) === 'speaking' ? fallbackMouthLevel(nowMs) : 0;
}

// ── onset punch (mirrors apps/web/lib/emotion-presentation.ts) ──────────────
// The package cannot import the app's presentation layer, so the envelope
// shape and constants are mirrored exactly. The app's presenter remains the
// owner of VRM punch; this duplicate only drives the 2D face.

export interface PunchTrackerOptions {
  /** Only an intensity at or above this punches (a mild mood still fades). */
  threshold?: number;
  /** Peak multiplier. 1.22 = 22% past the target. */
  gain?: number;
  attackMs?: number;
  holdMs?: number;
  settleMs?: number;
  /** A channel cannot punch again inside this window. */
  cooldownMs?: number;
}

/** 0 → 1 → hold → 1 → 0 envelope for a punch that started `elapsed` ms ago. */
export function facePunchEnvelope(
  elapsed: number,
  attackMs: number,
  holdMs: number,
  settleMs: number,
): number {
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  const attack = Math.max(1, attackMs);
  const hold = Math.max(0, holdMs);
  const settle = Math.max(1, settleMs);
  if (elapsed < attack) return smoothstep(elapsed / attack);
  if (elapsed < attack + hold) return 1;
  if (elapsed < attack + hold + settle) {
    return 1 - smoothstep((elapsed - attack - hold) / settle);
  }
  return 0;
}

export interface PunchTracker {
  /** Call on every expression change. True when this call started a punch. */
  update(intensity: number, nowMs: number): boolean;
  /** Gain multiplier for this frame (1 = no punch). */
  gain(nowMs: number): number;
  reset(): void;
}

export function createPunchTracker(options: PunchTrackerOptions = {}): PunchTracker {
  const threshold = options.threshold ?? 0.45;
  const gain = Math.max(1, options.gain ?? 1.22);
  const attackMs = options.attackMs ?? 120;
  const holdMs = options.holdMs ?? 120;
  const settleMs = options.settleMs ?? 200;
  const cooldownMs = options.cooldownMs ?? 900;
  let prevTarget = 0;
  let punchAt = -1;
  let lastPunchAt = -Infinity;

  return {
    update(intensity: number, nowMs: number): boolean {
      const target = clamp01(Number.isFinite(intensity) ? intensity : 0);
      const now = Number.isFinite(nowMs) ? nowMs : 0;
      let started = false;
      // Rising edge through the strength gate, and not still cooling down.
      if (target >= threshold && prevTarget < threshold && now - lastPunchAt >= cooldownMs) {
        punchAt = now;
        lastPunchAt = now;
        started = true;
      }
      prevTarget = target;
      return started;
    },
    gain(nowMs: number): number {
      if (punchAt < 0) return 1;
      const now = Number.isFinite(nowMs) ? nowMs : 0;
      const env = facePunchEnvelope(now - punchAt, attackMs, holdMs, settleMs);
      // `elapsed === 0` is the trigger frame (env 0 by definition) — keep the
      // punch alive there and only clear it once the envelope has run out.
      if (env <= 0 && now > punchAt) {
        punchAt = -1;
        return 1;
      }
      return 1 + (gain - 1) * env;
    },
    reset(): void {
      prevTarget = 0;
      punchAt = -1;
      lastPunchAt = -Infinity;
    },
  };
}

// ── expression blender (state → animated params) ────────────────────────────

export interface ExpressionBlenderOptions extends PunchTrackerOptions {
  /** Cross-fade length; defaults to STATE_BLEND_MS (160 ms). */
  blendMs?: number;
}

export interface SetLookOptions {
  nowMs?: number;
  /** State label reported by the blender (defaults to 'neutral'). */
  label?: ExpressionState;
  /** Strength used for the punch gate, 0..1 (defaults to 1). */
  intensity?: number;
  /** Punch gate override — idle/neutral pass 0 so the next emotion can punch. */
  punchIntensity?: number;
}

export interface ExpressionBlender {
  /** Ease toward a catalog emotion or transient robot state. */
  set(state: ExpressionState | string, intensity?: number, nowMs?: number): void;
  /** Ease toward an arbitrary blended look (e.g. paramsForHints). */
  setLook(look: FaceParams, options?: SetLookOptions): void;
  /** Render params for this frame. Pure for a given (state, now). */
  sample(nowMs?: number): FaceLook;
  readonly state: ExpressionState;
  readonly intensity: number;
  reset(nowMs?: number): void;
}

export function createExpressionBlender(options: ExpressionBlenderOptions = {}): ExpressionBlender {
  const blendMs = Math.max(1, options.blendMs ?? STATE_BLEND_MS);
  const punch = createPunchTracker(options);
  let from: FaceLook = NEUTRAL;
  let target: FaceLook = NEUTRAL;
  let state: ExpressionState = 'idle';
  let intensity = 0;
  let fromAt = 0;

  const sample = (atMs?: number): FaceLook => {
    const now = Number.isFinite(atMs) ? (atMs as number) : clock();
    const base = mixFaceLook(from, target, blendProgress(now - fromAt, blendMs));
    const gain = punch.gain(now);
    return gain === 1 ? base : applyFaceGain(base, gain);
  };

  const setLook = (lookParams: FaceParams, opts: SetLookOptions = {}): void => {
    const now = Number.isFinite(opts.nowMs) ? (opts.nowMs as number) : clock();
    from = sample(now);
    target = resolveFaceParams(lookParams);
    state = opts.label ?? 'neutral';
    intensity = clamp01(Number.isFinite(opts.intensity) ? (opts.intensity as number) : 1);
    fromAt = now;
    const punchStrength = Number.isFinite(opts.punchIntensity)
      ? clamp01(opts.punchIntensity as number)
      : intensity;
    punch.update(punchStrength, now);
  };

  return {
    set(stateName: ExpressionState | string, strength = 1, atMs?: number): void {
      const k = clamp01(Number.isFinite(strength) ? strength : 0);
      const name = resolveExpressionState(stateName);
      const opts: SetLookOptions = {
        label: name,
        intensity: k,
        punchIntensity: name === 'idle' || name === 'neutral' ? 0 : k,
      };
      if (Number.isFinite(atMs)) opts.nowMs = atMs as number;
      setLook(mixFaceLook(NEUTRAL, FACE_STATES[name], k), opts);
    },
    setLook,
    sample,
    get state(): ExpressionState {
      return state;
    },
    get intensity(): number {
      return intensity;
    },
    reset(atMs?: number): void {
      const now = Number.isFinite(atMs) ? (atMs as number) : clock();
      from = NEUTRAL;
      target = NEUTRAL;
      state = 'idle';
      intensity = 0;
      fromAt = now;
      punch.reset();
    },
  };
}

// ── canvas rendering (monitor / phone displays) ─────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const rgba = (r: number, g: number, b: number, a: number): string =>
  `rgba(${roundRgb(r)},${roundRgb(g)},${roundRgb(b)},${a})`;

export function drawFace(
  ctx: CanvasRenderingContext2D, w: number, h: number, p: FaceParams,
  t: number, blink: number, lookX = 0, lookY = 0, level = 0,
): void {
  const rp = resolveFaceParams(withLookAndVoice(p, { level }));
  const lx = clamp(lookX, -1, 1) * w * 0.022;
  const ly = clamp(lookY, -1, 1) * h * 0.016;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const bob = Math.sin(t * 2.2) * h * 0.02 * rp.bounce;
  const color = `rgb(${roundRgb(rp.r)},${roundRgb(rp.g)},${roundRgb(rp.b)})`;
  const pupilColor = rgba(rp.r2, rp.g2, rp.b2, 0.9);
  const eyeH = Math.max(0, rp.eyeH * (1 - clamp01(blink)));
  const closed = eyeH < 0.12;
  const ex = w * 0.19;
  const ey = cy - h * 0.06 + bob + ly;
  const ew = w * 0.13 * rp.eyeW;
  const eh = Math.max(2, h * 0.13 * eyeH);

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.min(w, h) * 0.08;
  // eyes — rounded lids, slanted for scorn / boredom
  for (const sign of [-1, 1] as const) {
    const exx = cx + sign * ex + lx;
    if (closed) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, h * 0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(exx - ew / 2, ey);
      ctx.quadraticCurveTo(exx, ey + h * 0.012, exx + ew / 2, ey);
      ctx.stroke();
      continue;
    }
    ctx.save();
    ctx.translate(exx, ey);
    ctx.rotate(sign * rp.eyeSlant * 0.22);
    rr(ctx, -ew / 2, -eh / 2, ew, eh, Math.min(ew, eh) / 2);
    ctx.fill();
    // pupil — bright core that slides with gaze and expression
    const pr = Math.max(1.5, Math.min(ew * 0.45, eh * 0.45, Math.min(ew, eh) * 0.22 * (0.6 + rp.pupil * 0.8)));
    ctx.fillStyle = pupilColor;
    ctx.beginPath();
    ctx.arc(rp.pupilX * ew * 0.28 + lx * 0.25, rp.pupilY * eh * 0.3 + ly * 0.25, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = color;
  }
  ctx.shadowBlur = 0;

  // blush — secondary colour under each eye
  if (rp.blush > 0.02) {
    ctx.fillStyle = rgba(rp.r2, rp.g2, rp.b2, 0.14 + rp.blush * 0.32);
    for (const sign of [-1, 1] as const) {
      ctx.beginPath();
      ctx.ellipse(cx + sign * ex + lx, ey + eh * 0.62, ew * 0.42, h * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // brows — tilt is the channel the shipped VRM rigs do not have
  const browVisible =
    Math.abs(rp.browTilt) > 0.02 || rp.browRaise > 0.02 || Math.abs(rp.browAsym) > 0.02;
  if (browVisible) {
    ctx.strokeStyle = rgba(rp.r, rp.g, rp.b, 0.85);
    ctx.lineWidth = Math.max(2, h * 0.012);
    ctx.lineCap = 'round';
    const browY = ey - eh / 2 - h * 0.05 - rp.browRaise * h * 0.025;
    for (const sign of [-1, 1] as const) {
      const innerX = cx + sign * ex + lx - sign * ew * 0.42;
      const outerX = cx + sign * ex + lx + sign * ew * 0.42;
      const asymLift = sign === 1 ? Math.max(0, rp.browAsym) : Math.max(0, -rp.browAsym);
      const y = browY - asymLift * h * 0.03;
      const innerY = y - rp.browTilt * h * 0.018;
      const outerY = y + rp.browTilt * h * 0.018;
      ctx.beginPath();
      ctx.moveTo(outerX, outerY);
      ctx.quadraticCurveTo((innerX + outerX) / 2, (innerY + outerY) / 2 - h * 0.008, innerX, innerY);
      ctx.stroke();
    }
  }

  // mouth — quadratic curve, smile lifts the middle up; pucker narrows it
  const mw = w * 0.2 * (1 - 0.42 * rp.pucker);
  const my = cy + h * 0.15 + bob;
  const lift = Math.abs(rp.smile) * h * 0.045;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + rp.open * h * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - mw, my);
  ctx.quadraticCurveTo(cx, my + (rp.smile >= 0 ? lift * 2 : -lift * 2), cx + mw, my);
  ctx.stroke();
  if (rp.open > 0.35) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, my + lift, mw * 0.35, h * 0.03 * rp.open, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (rp.pucker > 0.55) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, h * 0.01);
    ctx.beginPath();
    ctx.ellipse(cx, my, mw * 0.32, h * 0.024, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── LED matrix frame buffer (Unitree-style face) ────────────────────────────

export const LED_SIZE = 16;

/** Render face params to an RGB byte buffer (size×size×3), top-left origin. */
export function ledFrame(p: FaceParams, t: number, size = LED_SIZE, lookX = 0, lookY = 0, level = 0): Uint8Array {
  const rp = resolveFaceParams(withLookAndVoice(p, { level }));
  const buf = new Uint8Array(size * size * 3);
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    buf[i] = roundRgb(r); buf[i + 1] = roundRgb(g); buf[i + 2] = roundRgb(b);
  };
  const bobY = Math.round(Math.sin(t * 2.2) * rp.bounce);
  const lookXi = Math.round(clamp(lookX, -1, 1) * 1.5);
  const lookYi = Math.round(clamp(lookY, -1, 1) * 1);
  const cy = Math.floor(size / 2) + bobY;
  const eyeRows = Math.max(1, Math.round(3 * rp.eyeH));
  const eyeY = cy - 3 + lookYi;
  for (let y = 0; y < eyeRows; y++) {
    for (let x = 3; x <= 5; x++) set(x + lookXi, eyeY + y, rp.r, rp.g, rp.b);
    for (let x = 10; x <= 12; x++) set(x + lookXi, eyeY + y, rp.r, rp.g, rp.b);
  }
  // brows — one row above the eyes; tilt/asymmetry shifts which pixels light
  if (rp.browRaise > 0.15 || Math.abs(rp.browTilt) > 0.15 || Math.abs(rp.browAsym) > 0.2) {
    const tilt = Math.round(rp.browTilt);
    const asym = rp.browAsym > 0.2 ? -1 : rp.browAsym < -0.2 ? 1 : 0;
    set(3 + lookXi, eyeY - 1 - tilt, rp.r, rp.g, rp.b);
    set(5 + lookXi, eyeY - 1 + tilt, rp.r, rp.g, rp.b);
    set(10 + lookXi, eyeY - 1 + tilt, rp.r, rp.g, rp.b);
    set(12 + lookXi, eyeY - 1 - tilt + asym, rp.r, rp.g, rp.b);
  }
  // blush — dim secondary pixels under the eyes for the rosy states
  if (rp.blush > 0.35) {
    set(4 + lookXi, eyeY + 3, rp.r2, rp.g2, rp.b2);
    set(11 + lookXi, eyeY + 3, rp.r2, rp.g2, rp.b2);
  }
  // mouth
  const mY = cy + 4;
  const half = Math.max(2, Math.round(4 * (1 - 0.5 * rp.pucker)));
  for (let x = -half; x <= half; x++) {
    const curve = Math.round(rp.smile * (1 - Math.abs(x) / (half + 1)) * -2);
    const y = mY + (rp.smile >= 0 ? curve : -curve);
    set(Math.floor(size / 2) + x, y, rp.r, rp.g, rp.b);
    if (rp.open > 0.45 && Math.abs(x) < half - 1) set(Math.floor(size / 2) + x, y + 1, rp.r, rp.g, rp.b);
  }
  return buf;
}

// ── drivers ─────────────────────────────────────────────────────────────────

export interface FaceDriver {
  /** receives every LED frame — bridge it to your LED hardware (WS2812, Unitree face service, serial, ROS) */
  showFrame?(frame: Uint8Array, size: number): void;
  /** hook your robot TTS here (optional) */
  speak?(text: string): void;
}

/** POST each frame as JSON to your robot bridge (Unitree face service, ESP32, etc). */
export class HttpDriver implements FaceDriver {
  constructor(private url: string, private fps = 15) {}
  private last = 0;
  async showFrame(frame: Uint8Array, size: number): Promise<void> {
    const now = Date.now();
    if (now - this.last < 1000 / this.fps) return;
    this.last = now;
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size, frame: Array.from(frame) }),
      });
    } catch { /* robot offline — keep animating locally */ }
  }
}

/** Unitree Robotics — bridges to the built-in face LED service. */
export class UnitreeDriver extends HttpDriver {
  constructor(robotIp: string, port = 8080) {
    super(`http://${robotIp}:${port}/api/face`);
  }
}

// ── plug-and-use face engine ────────────────────────────────────────────────

export interface AmojiFaceOptions {
  canvas?: HTMLCanvasElement | null;
  driver?: FaceDriver;
  ledSize?: number;
  holdMs?: number; // how long an expressed emotion holds before easing back
  /** Idle gaze drift + blink on the clock; set false when an external gaze
   *  tracker owns the eyes. Defaults to true. */
  idleMotion?: boolean;
}

export class AmojiFace {
  private expr = createExpressionBlender();
  private cur: FaceLook = { ...NEUTRAL };
  private raf = 0;
  private t0 = 0;
  private blink = 0;
  private holdUntil = 0;
  private holding = false;
  private speakingUntil = 0;
  private mouthLevel = 0;
  private lastLevelAt = 0;
  private lastNow = 0;
  private lookX = 0;
  private lookY = 0;
  private level = 0;
  private mode: ExpressionState = 'idle';

  constructor(private opts: AmojiFaceOptions = {}) {}

  get current(): FaceParams {
    return this.cur;
  }

  /** The expression currently being eased toward. */
  get state(): ExpressionState {
    return this.mode;
  }

  /** Eyes glide toward a gaze point, −1..1 on both axes. Call with (0,0) to recenter. */
  setLook(x: number, y: number): void {
    this.lookX = clamp(x, -1, 1);
    this.lookY = clamp(y, -1, 1);
  }

  /** Feed live voice amplitude (0..1) for lipsync; auto-decays if you stop feeding. */
  setVoiceLevel(v: number): void {
    this.level = clamp(v, 0, 1);
    this.lastLevelAt = clock();
  }

  /** Drive a transient robot state or any catalog emotion by name. */
  setExpression(state: string, intensity = 1, holdMs?: number): void {
    const now = clock();
    const name = resolveExpressionState(state);
    this.mode = name;
    this.expr.set(name, intensity, now);
    this.holdUntil = now + (holdMs ?? this.opts.holdMs ?? 4000);
    this.holding = true;
    this.cur = this.expr.sample(now);
  }

  /** Drive the face straight from LLM emotion hints (dominant-blended). */
  showHints(hints: Partial<Record<EmotionId, number>>, holdMs?: number): void {
    if (!hints || Object.keys(hints).length === 0) return;
    const now = clock();
    const top = (Object.entries(hints) as Array<[string, number | undefined]>)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    this.mode = resolveExpressionState(top?.[0] ?? 'neutral');
    this.expr.setLook(paramsForHints(hints), {
      nowMs: now,
      label: this.mode,
      intensity: clamp01(top?.[1] ?? 0),
    });
    this.holdUntil = now + (holdMs ?? this.opts.holdMs ?? 4000);
    this.holding = true;
    this.cur = this.expr.sample(now);
  }

  start(): void {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return;
    this.t0 = performance.now();
    this.lastNow = this.t0;
    const loop = (now: number) => {
      const dt = this.lastNow > 0 ? Math.min(250, Math.max(0, now - this.lastNow)) : 16;
      this.lastNow = now;
      if (this.holding && now > this.holdUntil) {
        this.holding = false;
        this.mode = 'idle';
        this.expr.set('idle', 1, now);
      }
      this.cur = this.expr.sample(now);
      // Voice level decays so a caller that stops feeding samples still closes.
      this.level *= Math.exp(-dt / 180);
      const speaking = now < this.speakingUntil;
      const levelFresh = now - this.lastLevelAt < 250;
      const fallback = speaking && !levelFresh ? fallbackMouthLevel(now) : 0;
      const mouthTarget = this.level > 0.02 ? this.level : fallback;
      this.mouthLevel = smoothMouthLevel(this.mouthLevel, mouthTarget, dt);
      // Idle micro-motion is clock-derived (no Math.random): a blink schedule
      // plus a subtle gaze drift while nothing else owns the eyes. An external
      // gaze tracker (setLook) always wins, and can opt out entirely.
      this.blink = idleBlinkAmount(now);
      const drifting = this.opts.idleMotion !== false
        && this.mode === 'idle'
        && Math.abs(this.lookX) < 0.02
        && Math.abs(this.lookY) < 0.02;
      const drift = drifting ? idleGazeOffset(now) : null;
      const gazeX = clamp(this.lookX + (drift?.x ?? 0), -1, 1);
      const gazeY = clamp(this.lookY + (drift?.y ?? 0), -1, 1);
      const canvas = this.opts.canvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawFace(ctx, canvas.width, canvas.height, this.cur, now / 1000, this.blink, gazeX, gazeY, this.mouthLevel);
      }
      this.opts.driver?.showFrame?.(ledFrame(this.cur, now / 1000, this.opts.ledSize ?? LED_SIZE, gazeX, gazeY, this.mouthLevel), this.opts.ledSize ?? LED_SIZE);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastNow = 0;
  }

  /** Analyze text, show the matching expression, and (optionally) speak it. */
  say(text: string): void {
    const now = clock();
    const hints = analyzeText(text);
    const top = (Object.entries(hints) as Array<[string, number | undefined]>)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    this.mode = resolveExpressionState(top?.[0] ?? 'speaking');
    this.expr.setLook(paramsForHints(hints), {
      nowMs: now,
      label: this.mode,
      intensity: clamp01(top?.[1] ?? 0.5),
    });
    this.holdUntil = now + (this.opts.holdMs ?? 4000);
    this.holding = true;
    this.speakingUntil = this.holdUntil;
    this.cur = this.expr.sample(now);
    this.opts.driver?.speak?.(text);
  }

  /** Directly drive an emotion: 'joy' | 'sadness' | 'anger' | ... */
  setEmotion(emotion: string, intensity = 1): void {
    this.setExpression(emotion, intensity);
  }
}
