/**
 * Mic ↔ speaker bleed helpers.
 *
 * When the companion talks through the device speakers, Web Speech / the mic
 * often hears her own line. Treating that as a user turn produces a second
 * reply that feels like an "echo" of her voice.
 */

/** Compact form for fuzzy compare: letters/digits only, lowercased. */
export function echoCompareKey(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * True when `heard` is likely the companion's own TTS picked up by the mic.
 * Short fragments stay free so a real "嗯" / "yes" barge-in still cuts her.
 * A longer user turn that merely quotes her is NOT treated as echo.
 */
export function looksLikeSpeechEcho(heard: string, spoken: string): boolean {
  const a = echoCompareKey(heard);
  const b = echoCompareKey(spoken);
  if (!a || !b) return false;
  const cjk = /[\u3400-\u9fff]/.test(a) || /[\u3400-\u9fff]/.test(b);
  const minLen = cjk ? 4 : 8;
  if (a.length < minLen) return false;
  if (a === b) return true;
  // Mic caught a slice of her line (not longer than what she said).
  if (a.length <= b.length + 2 && b.includes(a)) return true;
  // Same opening clause, still no longer than her line.
  const n = Math.min(cjk ? 6 : 12, a.length, b.length);
  return n >= minLen && a.length <= b.length + 2 && a.slice(0, n) === b.slice(0, n);
}
