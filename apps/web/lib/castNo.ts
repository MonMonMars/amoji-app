'use client';
// Stable cast numbers (r2026-10-04.52) — quick reference for reviews:
// "check #13's hair" beats "check fumiriya's hair" on a phone.
// Keep in sync with CHARACTERS order in prefs.ts (display order).
// Flagship top-10 (agent3 gallery order) first, then the classic cast.
export const CAST_NO = {
  nova: 1,
  kizuna: 2,
  alicia: 3,
  ember: 4,
  mei: 5,
  atlas: 6,
  sky: 7,
  yuki: 8,
  hina: 9,
  mio: 10,
  mochi: 11,
  juno: 12,
  blaze: 13,
  kai: 14,
  luna: 15,
  rin: 16,
  ren: 17,
  cloud: 18,
  kasumi: 19,
  marin: 20,
  ayane: 21,
  hitomi: 22,
  robbie: 23,
  mika: 24,
  anchor: 25,
  lydia: 26,
  ruby: 27,
  snowy: 28,
  alan: 29,
} as const;

export type CastId = keyof typeof CAST_NO;

/** stable number for a character id — 0 means unknown (never shipped) */
export function castNo(id: string): number {
  return (CAST_NO as Record<string, number>)[id] ?? 0;
}
