'use client';
import { cleanForSpeech, stripVoicedGlyphs } from './speak-text';
import { splitChunks, pauseAfterClause } from './gtts';
import { speechDurationMs } from './speech';

export const SPEECH_CAPTION_EVENT = 'amoji:speech-caption';

let rollTimer: ReturnType<typeof setTimeout> | null = null;

export function clearSpeechCaption(): void {
  if (rollTimer) {
    clearTimeout(rollTimer);
    rollTimer = null;
  }
  try {
    window.dispatchEvent(new CustomEvent(SPEECH_CAPTION_EVENT, { detail: { line: '' } }));
  } catch { /* SSR */ }
}

/** One clause now on screen (driven by the active TTS chunk). */
export function dispatchSpeechCaption(line: string): void {
  if (rollTimer) {
    clearTimeout(rollTimer);
    rollTimer = null;
  }
  const t = line.trim();
  if (!t) return;
  try {
    window.dispatchEvent(new CustomEvent(SPEECH_CAPTION_EVENT, { detail: { line: t } }));
  } catch { /* SSR */ }
}

/** Neural / single-blob tiers: advance captions on a clause clock. */
export function rollCaptionsForLine(text: string): void {
  if (rollTimer) {
    clearTimeout(rollTimer);
    rollTimer = null;
  }
  const spoken = cleanForSpeech(text);
  // Keep raw chunks (with `\n` / `\n\n` markers) so pauseAfterClause sees
  // paragraph breaks; captions show the stripped spoken form.
  const rawParts = splitChunks(spoken).filter((c) => stripVoicedGlyphs(c).trim());
  if (!rawParts.length) return;
  let i = 0;
  const tick = () => {
    const raw = rawParts[i]!;
    const shown = stripVoicedGlyphs(raw).trim();
    dispatchSpeechCaption(shown);
    i += 1;
    if (i < rawParts.length) {
      const gap = pauseAfterClause(raw) + speechDurationMs(shown);
      rollTimer = setTimeout(tick, Math.max(240, gap));
    }
  };
  tick();
}

/** Last N spoken clauses for a streaming draft (subtitle preview before audio). */
export function rollingCaptionFromText(text: string, maxClauses = 2): string {
  const spoken = cleanForSpeech(text);
  if (!spoken.trim()) return '';
  const parts = splitChunks(spoken)
    .map((c) => stripVoicedGlyphs(c).trim())
    .filter(Boolean);
  return parts.slice(-maxClauses).join(' ');
}
