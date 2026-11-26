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

let factTurnSpokenAt = 0;

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
