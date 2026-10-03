'use client';
import { EmotionEngine, analyzeText } from '@amoji/emotion-core';
import type { EmotionConfig, EmotionFrame } from '@amoji/emotion-core';
import { loadConfig } from './companion-store';

let engine: EmotionEngine | null = null;
export function getEngine(): EmotionEngine {
  if (!engine) {
    engine = new EmotionEngine(loadConfig(), Date.now() % 100000);
  }
  return engine;
}
export function feedUtterance(text: string): void {
  const e = getEngine();
  const lex = analyzeText(text);
  if (Object.keys(lex).length) e.update({ lexicon: lex });
}
export function applyLlmHints(hints: Record<string, number>): void {
  getEngine().update({ llmTags: hints as never });
}
export function patchConfig(patch: Partial<EmotionConfig>): void {
  getEngine().setConfig(patch);
  try { localStorage.setItem('amoji.config.v1', JSON.stringify(getEngine().getConfig())); } catch { /* ignore */ }
}

// ---- shared frame cache: ONE ticker (CompanionCanvas), many readers ---------
let latestFrame: EmotionFrame | null = null;
export function tickEngine(dtMs: number): EmotionFrame {
  latestFrame = getEngine().tick(dtMs);
  return latestFrame;
}
export function getLatestFrame(): EmotionFrame | null {
  return latestFrame;
}

// ---- laughter overlay — set when something's funny; CompanionCanvas reads ----
// this to drive a whole-body giggle (rhythmic squash-bounce, head thrown
// back, full smile) for ~1.6s while the giggle lead + punchline play.
let laughAtMs = -Infinity;
export function triggerLaugh(now = Date.now()): void { laughAtMs = now; }
export function lastLaughAt(): number { return laughAtMs; }

// ---- coarse mood for the status plate + mic emotion orb ---------------------
export type MoodId = 'joy' | 'angry' | 'sad' | 'surprised' | 'relaxed' | 'neutral';

export function dominantMood(f: EmotionFrame | null): MoodId {
  if (!f) return 'neutral';
  const face = f.face;
  const scores: Record<Exclude<MoodId, 'neutral'>, number> = {
    joy: face.mouthSmile * 0.7 + face.cheekRaise * 0.3,
    angry: face.browDown * 0.7 + face.lipPress * 0.3,
    sad: face.mouthFrown * 0.7 + face.browInnerUp * 0.3,
    surprised: face.eyeWide * 0.7 + face.browOuterUp * 0.3 + face.jawDrop * 0.3,
    relaxed: face.lidClosure * 0.5 + face.mouthPucker * 0.3,
  };
  let best: MoodId = 'neutral';
  let bestV = 0.35; // below this the face reads as calm/neutral
  for (const [k, v] of Object.entries(scores) as Array<[Exclude<MoodId, 'neutral'>, number]>) {
    if (v > bestV) { best = k; bestV = v; }
  }
  return best;
}
