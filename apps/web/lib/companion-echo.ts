/** Detect when the mic hears the companion's own TTS (speaker leak). */

export function normalizeHeardText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/["“”'‘’`.,!?;:，。！？、…—–\-]/g, '')
    .trim();
}

/**
 * True when `heard` is likely the companion line leaking into the mic.
 * Short fragments stay unblocked so a real "hi" / "ok" still gets through.
 */
export function isCompanionEcho(heard: string, companionLines: readonly string[]): boolean {
  const h = normalizeHeardText(heard);
  if (h.length < 4) return false;
  for (const line of companionLines) {
    const c = normalizeHeardText(line);
    if (c.length < 4) continue;
    if (h === c) return true;
    if (c.includes(h) && h.length >= 6) return true;
    if (h.includes(c) && c.length >= 8) return true;
  }
  return false;
}
