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
export function rollingCaptionFromText(text: string, maxClauses = 1): string {
  const spoken = cleanForSpeech(text);
  if (!spoken.trim()) return '';
  const parts = splitChunks(spoken)
    .map((c) => stripVoicedGlyphs(c).trim())
    .filter(Boolean);
  return parts.slice(-maxClauses).join(' ');
}

/** Clause body without trailing closers — matches speech-queue lead dedupe (#399). */
function captionClauseBody(line: string): string {
  return line.trim().replace(/[\s。.！!？?]+$/u, '');
}

function captionClausesMatch(a: string, b: string): boolean {
  const ta = a.trim();
  const tb = b.trim();
  if (!ta || !tb) return false;
  if (ta === tb) return true;
  return captionClauseBody(ta) === captionClauseBody(tb);
}

/** Drop consecutive identical clauses (TTS lead→remainder can re-dispatch). */
export function dedupeConsecutiveCaptions(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (!s) continue;
    if (out.length && captionClausesMatch(out[out.length - 1]!, s)) continue;
    out.push(s);
  }
  return out;
}

/**
 * Caption ladder: the live front line stays alone at the bottom. When a new
 * clause arrives, the previous front line moves up into settled history so
 * captions never stack on top of each other in one row.
 *
 * Empty `next` clears the *live* front/ladder for the caller. Use
 * `commitCaptionLines` first so spoken clauses become the durable history
 * body — never wipe captions and then dump the full phrase again.
 */
export function stepCaptionLadder(
  ladder: string[],
  current: string,
  next: string,
  maxSettled = 6,
): { ladder: string[]; current: string } {
  const n = next.trim();
  const c = current.trim();
  if (!n) return { ladder: [], current: '' };
  if (c && c !== n) {
    // Skip promoting a line that is already the settled tail (re-dispatch).
    const promoted = (ladder.length && captionClausesMatch(ladder[ladder.length - 1]!, c))
      ? ladder
      : [...ladder, c];
    return { ladder: promoted.slice(-Math.max(1, maxSettled)), current: n };
  }
  return { ladder, current: n || c };
}

/**
 * Freeze live captions into durable clause lines for the assistant turn.
 * Prefer these lines in history instead of replaying the full reply blob
 * after the user already read each clause as a caption.
 */
export function commitCaptionLines(ladder: string[], current: string): string[] {
  const c = current.trim();
  const base = dedupeConsecutiveCaptions(ladder);
  if (!c) return base;
  if (base.length && captionClausesMatch(base[base.length - 1]!, c)) return base;
  return dedupeConsecutiveCaptions([...base, c]);
}

/**
 * True when sealed caption lines already cover the assistant reply text
 * (whitespace/punct differences ignored). Used to hide the full-phrase
 * history replay after realtime captions.
 */
export function captionsCoverReply(lines: string[], content: string): boolean {
  if (!lines.length) return false;
  const norm = (s: string) => s.replace(/\s+/g, '').trim();
  const joined = norm(lines.join(''));
  const full = norm(content);
  if (!joined || !full) return false;
  return joined === full || full.includes(joined) || joined.includes(full);
}
