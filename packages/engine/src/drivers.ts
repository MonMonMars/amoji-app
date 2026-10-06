// ─────────────────────────────────────────────────────────────────────────────
// @amoji/engine — body & voice driver contracts.
//
// Design rule (from the B2B spec): Amoji never touches safety-critical robot
// control. The BodyDriver receives *intent* ("look excited, 0.8") and the
// licensee's own stack maps that onto their OEM high-level motion API,
// inside the OEM's safety envelope. Null drivers make every channel optional.
// ─────────────────────────────────────────────────────────────────────────────

/** What the face display needs to expose — satisfied by @amoji/robot-face's AmojiFace. */
export interface FaceHandle {
  say?(text: string): void;
  setEmotion?(emotion: string, intensity?: number): void;
  start?(): void;
  stop?(): void;
}

/** Body channel: posture + discrete gestures. Pure intent, no balance control. */
export interface BodyDriver {
  /** continuous posture modulation, -1..1 channels in the licensee's mapping */
  setPosture(emotion: string, intensity: number): void;
  /** discrete gesture ids: 'poke', 'greet', 'nod', 'shake', 'celebrate', … */
  gesture(id: string): void;
}

export class NullBodyDriver implements BodyDriver {
  setPosture(): void {}
  gesture(): void {}
}

/** Voice prosody — multipliers the licensee's TTS understands. */
export interface VoiceProsody {
  /** speech-rate multiplier, 1 = normal (joy slightly faster, sadness slower) */
  rate: number;
  /** pitch multiplier, 1 = baseline */
  pitch: number;
  /** energy/volume multiplier, 1 = baseline */
  energy: number;
}

export const NEUTRAL_PROSODY: VoiceProsody = { rate: 1, pitch: 1, energy: 1 };

/** Emotion → TTS style. Works with any TTS engine that takes rate/pitch. */
export function prosodyForEmotion(emotion: string, intensity = 1): VoiceProsody {
  const k = Math.min(1, Math.max(0, intensity));
  const mix = (base: VoiceProsody): VoiceProsody => ({
    rate: 1 + (base.rate - 1) * k,
    pitch: 1 + (base.pitch - 1) * k,
    energy: 1 + (base.energy - 1) * k,
  });
  switch (emotion) {
    case 'joy':
    case 'excitement':
      return mix({ rate: 1.12, pitch: 1.15, energy: 1.25 });
    case 'love':
    case 'contentment':
      return mix({ rate: 0.94, pitch: 1.02, energy: 0.85 });
    case 'sadness':
    case 'shame':
      return mix({ rate: 0.82, pitch: 0.88, energy: 0.6 });
    case 'anger':
    case 'contempt':
      return mix({ rate: 1.08, pitch: 0.85, energy: 1.35 });
    case 'fear':
      return mix({ rate: 1.22, pitch: 1.3, energy: 1.2 });
    case 'surprise':
      return mix({ rate: 1.15, pitch: 1.35, energy: 1.3 });
    case 'pride':
      return mix({ rate: 0.96, pitch: 0.98, energy: 1.1 });
    case 'relief':
      return mix({ rate: 0.9, pitch: 0.95, energy: 0.75 });
    case 'boredom':
      return mix({ rate: 0.85, pitch: 0.9, energy: 0.55 });
    default:
      return { ...NEUTRAL_PROSODY };
  }
}

/** Voice channel: speak text with optional prosody coloring. */
export interface VoiceDriver {
  speak(text: string, prosody?: VoiceProsody): void;
}

export class NullVoiceDriver implements VoiceDriver {
  speak(): void {}
}

/** Gait-modulation hints for quadruped/humanoid high-level APIs (Phase 2 seed). */
export interface GaitHint {
  /** bounce amplitude multiplier for the OEM's default trot/idle */
  bounce: number;
  /** tempo multiplier for gait/idle-sway */
  tempo: number;
  /** head pitch offset in degrees (positive = up), keep small */
  headPitchDeg: number;
}

/** Map an emotion to a conservative gait hint — licensees clamp further. */
export function gaitHintForEmotion(emotion: string, intensity = 1): GaitHint {
  const k = Math.min(1, Math.max(0, intensity));
  const table: Record<string, GaitHint> = {
    joy: { bounce: 1 + 0.5 * k, tempo: 1 + 0.25 * k, headPitchDeg: 4 * k },
    excitement: { bounce: 1 + 0.9 * k, tempo: 1 + 0.45 * k, headPitchDeg: 6 * k },
    sadness: { bounce: 1 - 0.5 * k, tempo: 1 - 0.3 * k, headPitchDeg: -8 * k },
    contentment: { bounce: 1, tempo: 1 - 0.1 * k, headPitchDeg: 2 * k },
    anger: { bounce: 1 + 0.3 * k, tempo: 1 + 0.2 * k, headPitchDeg: -4 * k },
    fear: { bounce: 1 + 0.4 * k, tempo: 1 + 0.5 * k, headPitchDeg: -6 * k },
    surprise: { bounce: 1 + 0.4 * k, tempo: 1 + 0.3 * k, headPitchDeg: 8 * k },
    pride: { bounce: 1 + 0.2 * k, tempo: 1, headPitchDeg: 6 * k },
    boredom: { bounce: 1 - 0.4 * k, tempo: 1 - 0.25 * k, headPitchDeg: -5 * k },
  };
  return table[emotion] ?? { bounce: 1, tempo: 1, headPitchDeg: 0 };
}
