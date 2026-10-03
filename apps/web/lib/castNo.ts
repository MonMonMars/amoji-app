'use client';
// Stable cast numbers (r2026-10-04.51) — quick reference for reviews:
// "check #13's hair" beats "check fumiriya's hair" on a phone.
// Keep in sync with CHARACTERS order in prefs.ts (display order).
export const CAST_NO = {
  juno: 1,
  nova: 2,
  blaze: 3,
  mochi: 4,
  kai: 5,
  luna: 6,
  rin: 7,
  ren: 8,
  tifa: 9,
  aerith: 10,
  cloud: 11,
  kasumi: 12,
  marin: 13,
  ayane: 14,
  hitomi: 15,
  robbie: 16,
  mika: 17,
  anchor: 18,
  lydia: 19,
  ruby: 20,
  snowy: 21,
  alan: 22,
} as const;

export type CastId = keyof typeof CAST_NO;

/** stable number for a character id — 0 means unknown (never shipped) */
export function castNo(id: string): number {
  return (CAST_NO as Record<string, number>)[id] ?? 0;
}
