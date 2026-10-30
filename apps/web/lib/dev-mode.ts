// DEV-ONLY QA marks (?dev=1 / localStorage / build flag).
// Public builds stay clean unless the flag is on.

export const DEV_STORAGE_KEY = 'amoji.dev';

/** True when ?dev=1, localStorage amoji.dev=1, or NEXT_PUBLIC_AMOJI_DEV=1. */
export function isDevMode(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AMOJI_DEV === '1') return true;
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('dev') === '1' || q.get('dev') === 'true') return true;
    if (window.localStorage.getItem(DEV_STORAGE_KEY) === '1') return true;
  } catch { /* private mode */ }
  return false;
}

/**
 * Momoto DEV map (prefix + number on interactive controls):
 * A characters · B scenes · L languages · V voices · R reactions/SFX (CLIP #)
 * I idle rails · G mini-game · S settings · T Start/Change · W volume steps
 * C chat mic/send · K kid/toggles · X sheet actions
 */
export type DevGroup = 'A' | 'B' | 'L' | 'V' | 'R' | 'I' | 'G' | 'S' | 'T' | 'W' | 'C' | 'K' | 'X';

export function devMark(group: DevGroup, n: number): string {
  return `${group}${n}`;
}
