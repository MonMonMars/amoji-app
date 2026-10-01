'use client';
import { EmotionEngine, analyzeText } from '@amoji/emotion-core';
import type { EmotionConfig } from '@amoji/emotion-core';
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
