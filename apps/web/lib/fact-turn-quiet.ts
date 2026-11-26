// Owner 2026-11-25: after a live news/weather read, the idle chatter loop was
// allowed to fire its personality/motif lines ("我差啲收埋一朵新鮮嘅花…") on the
// next 5s tick — the fetch had already used up the 40s quiet window, so the
// poetic line landed right after the story and sounded bolted on to the news.
//
// A fact tell (news / weather / search snippet) now marks this window; idle
// pickers stay silent until it passes, so a fact turn is never followed by an
// unrelated poetic sentence.

/** How long after a fact tell idle chatter stays silent. */
export const FACT_TURN_QUIET_MS = 90_000;

/**
 * How long one fact line counts as "already told". The owner reported the same
 * news read twice on three separate turns ("it always repeat two times", then
 * "repeated one time again"), and every previous fix only trimmed text. A line
 * that was just dispatched must be impossible to dispatch again — by the news
 * branch, the demo chip, the showcase offer or a re-render.
 */
export const FACT_LINE_REPEAT_WINDOW_MS = 120_000;

let factTurnSpokenAt = 0;

/** Recently dispatched fact lines (news only — weather may legitimately repeat). */
const toldFactLines: Array<{ key: string; at: number }> = [];

/** Signature that ignores spacing / punctuation / case differences. */
function factLineKey(line: string): string {
  return String(line || '')
    .toLowerCase()
    .replace(/[\s\u3000]+/g, ' ')
    .replace(/[。！？.!?、，,：:；;…—–\-“”"'‘’（）()《》【】\[\]]/g, '')
    .trim();
}

/**
 * Claim a fact line for speech. Returns `true` exactly once per line per window,
 * so a caller can do `if (claimFactLineOnce(key)) speak(line)` and a second
 * dispatch of the same tell is dropped.
 *
 * Callers pass the STORY key (the headline) when they have it, so a re-read that
 * only reformats the day intro is still the same tell. The whole spoken line is
 * the fallback key.
 */
export function claimFactLineOnce(line: string, now = Date.now()): boolean {
  const key = factLineKey(line);
  if (!key) return false;
  const cutoff = now - FACT_LINE_REPEAT_WINDOW_MS;
  while (toldFactLines.length && toldFactLines[0]!.at < cutoff) toldFactLines.shift();
  // Same tell when the signatures match or one contains the other (a truncated
  // re-render / an enriched version of the same read).
  const duplicate = toldFactLines.some((row) => row.key === key
    || (key.length >= 40 && row.key.includes(key))
    || (row.key.length >= 40 && key.includes(row.key)));
  if (duplicate) return false;
  toldFactLines.push({ key, at: now });
  return true;
}

/** Test helper — forget recently told fact lines. */
export function resetFactLineOnce(): void {
  toldFactLines.length = 0;
}

/** Mark that a live fact line was just composed for speech. */
export function markFactTurnSpoken(now = Date.now()): void {
  factTurnSpokenAt = now;
}

/** True while idle chatter must not add a poetic / unrelated line. */
export function factTurnQuietActive(now = Date.now()): boolean {
  return factTurnSpokenAt > 0 && now - factTurnSpokenAt < FACT_TURN_QUIET_MS;
}

/** Test helper — drop the marker. */
export function resetFactTurnQuiet(): void {
  factTurnSpokenAt = 0;
}
