'use client';
// Stable cast numbers — quick reference for reviews:
// "check #3's hair" beats "check kizuna's hair" on a phone.
// Keep in sync with CHARACTERS order in prefs.ts (display order).
// r2026-10-05.118 roster trim: deleted old #5–18, #21–29, #33.
// Survivors renumbered 1–10 with kitagawa (old #34) promoted to #1 / default.
export const CAST_NO = {
  kitagawa: 1,
  nova: 2,
  kizuna: 3,
  alicia: 4,
  ember: 5,
  kasumi: 6,
  marin: 7,
  aera: 8,
  dhahlia: 9,
  onyx: 10,
} as const;

export type CastId = keyof typeof CAST_NO;

/** stable number for a character id — 0 means unknown (never shipped) */
export function castNo(id: string): number {
  return (CAST_NO as Record<string, number>)[id] ?? 0;
}
