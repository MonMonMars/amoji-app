/**
 * Owner-facing story / fairy-tale codes (ST###) — parallel to MV### music rows.
 * Spoken catalog: `classic-fairy-tales.ts` + warm merge.
 */

import {
  CLASSIC_FAIRY_TALES,
  type ClassicFairyTale,
  pickClassicFairyTale,
  taleByOwnerCode as lookupTaleByOwnerCode,
} from './classic-fairy-tales';

export const STORY_OWNER_CODE_PREFIX = 'ST' as const;

/** First ST code assigned to bundled classic tales (ST001…). */
export const STORY_OWNER_FIRST = 1;

export function storyOwnerCode(n: number): string {
  return `${STORY_OWNER_CODE_PREFIX}${String(n).padStart(3, '0')}`;
}

export function normalizeStoryOwnerCode(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^ST\d{3}$/.test(t)) return t;
  if (/^ST\d{1,2}$/.test(t)) return storyOwnerCode(Number(t.replace(/^ST/i, '')));
  if (/^\d{1,3}$/.test(t)) return storyOwnerCode(Number(t));
  return t;
}

export function highestStoryOwnerCode(
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): string {
  let max = 0;
  for (const tale of catalog) {
    const code = tale.ownerCode;
    if (!code?.startsWith('ST')) continue;
    const n = Number(code.slice(2));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return storyOwnerCode(max || STORY_OWNER_FIRST);
}

export const STORY_CATALOG_COUNT = (): number =>
  CLASSIC_FAIRY_TALES.filter((t) => t.ownerCode).length;

export function taleByOwnerCode(
  code: string,
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): ClassicFairyTale | null {
  return lookupTaleByOwnerCode(normalizeStoryOwnerCode(code), catalog);
}

export function storyCatalogRows(
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): { ownerCode: string; slug: string; length: string; titleEn: string; author: string }[] {
  return catalog
    .filter((t): t is ClassicFairyTale & { ownerCode: string } => !!t.ownerCode)
    .map((t) => ({
      ownerCode: t.ownerCode,
      slug: t.slug,
      length: t.length,
      titleEn: t.title.en,
      author: t.author,
    }))
    .sort((a, b) => a.ownerCode.localeCompare(b.ownerCode));
}

const ST_CODE_IN_TEXT = /\bST\s*0*(\d{1,3})\b/i;

/** Owner / Pixel ST### pick wins over rotation when present in the user line. */
export function pickClassicFairyTaleForIntent(
  lang: string | undefined,
  rotationIndex: number,
  userText: string,
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): ClassicFairyTale {
  const m = userText.match(ST_CODE_IN_TEXT);
  if (m) {
    const code = storyOwnerCode(Number(m[1]));
    const picked = lookupTaleByOwnerCode(code, catalog);
    if (picked) return picked;
  }
  return pickClassicFairyTale(lang, rotationIndex, catalog);
}

export function assertUniqueStoryOwnerCodes(
  catalog: readonly ClassicFairyTale[] = CLASSIC_FAIRY_TALES,
): void {
  const seen = new Set<string>();
  for (const tale of catalog) {
    const code = tale.ownerCode;
    if (!code) continue;
    if (seen.has(code)) {
      throw new Error(`Duplicate story owner code ${code} (id ${tale.id})`);
    }
    seen.add(code);
  }
}