'use client';
// Warm / predownload path for classic fairy tales.
// Bundled catalog is always available synchronously; this module also fetches
// the public JSON mirror into HTTP + memory cache so Story taps never wait on
// an empty network for the first tale.

import { assetUrl } from './asset';
import {
  CLASSIC_FAIRY_TALES,
  classicFairyTalePublicPath,
  type ClassicFairyTale,
  type TaleLengthTier,
} from './classic-fairy-tales';

export type ClassicFairyTaleWarmResult = {
  ok: boolean;
  bundled: number;
  fetched: number;
  fromCache: boolean;
  error?: string;
};

let warmPromise: Promise<ClassicFairyTaleWarmResult> | null = null;
let warmDone = false;
let lastResult: ClassicFairyTaleWarmResult | null = null;
/** Optional extras merged from the JSON mirror (future expansion). */
let extras: ClassicFairyTale[] = [];

const LANGS = ['en', 'yue', 'zh', 'ja'] as const;
const LENGTHS: TaleLengthTier[] = ['short', 'medium', 'long', 'veryLong'];

function isLangRecord(v: unknown): v is Record<(typeof LANGS)[number], string> {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return LANGS.every((k) => typeof o[k] === 'string' && String(o[k]).trim().length > 0);
}

function parseTale(raw: unknown): ClassicFairyTale | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.slug !== 'string') return null;
  if (!LENGTHS.includes(o.length as TaleLengthTier)) return null;
  if (typeof o.author !== 'string' || typeof o.credit !== 'string' || typeof o.sourceUrl !== 'string') {
    return null;
  }
  if (!isLangRecord(o.title) || !isLangRecord(o.text)) return null;
  return {
    id: o.id,
    slug: o.slug,
    length: o.length as TaleLengthTier,
    author: o.author,
    credit: o.credit,
    sourceUrl: o.sourceUrl,
    title: o.title,
    text: o.text,
  };
}

export function isClassicFairyTaleCacheWarm(): boolean {
  return warmDone;
}

export function classicFairyTaleWarmSnapshot(): ClassicFairyTaleWarmResult | null {
  return lastResult;
}

/** Bundled tales plus any extras loaded from the JSON mirror. */
export function resolvedClassicFairyTales(): readonly ClassicFairyTale[] {
  if (!extras.length) return CLASSIC_FAIRY_TALES;
  const seen = new Set(CLASSIC_FAIRY_TALES.map((t) => t.id));
  const merged = [...CLASSIC_FAIRY_TALES];
  for (const t of extras) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      merged.push(t);
    }
  }
  return merged;
}

/**
 * Prefetch the public JSON mirror (force-cache) and mark the catalog warm.
 * Safe to call many times — shares one in-flight promise. Works offline via
 * the bundled catalog even when fetch fails.
 */
export function warmClassicFairyTaleCache(): Promise<ClassicFairyTaleWarmResult> {
  if (warmPromise) return warmPromise;
  warmPromise = (async (): Promise<ClassicFairyTaleWarmResult> => {
    const bundled = CLASSIC_FAIRY_TALES.length;
    // Prefer fetch whenever available (browser + vitest stubs). Without fetch
    // we still mark warm from the bundled catalog so Story never blocks.
    if (typeof fetch !== 'function') {
      warmDone = true;
      lastResult = { ok: true, bundled, fetched: 0, fromCache: true };
      return lastResult;
    }
    const url = assetUrl(classicFairyTalePublicPath());
    try {
      const res = await fetch(url, {
        cache: 'force-cache',
        mode: 'cors',
        credentials: 'same-origin',
      } as RequestInit);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { tales?: unknown };
      const parsed: ClassicFairyTale[] = [];
      if (Array.isArray(data?.tales)) {
        for (const row of data.tales) {
          const tale = parseTale(row);
          if (tale) parsed.push(tale);
        }
      }
      extras = parsed;
      warmDone = true;
      lastResult = {
        ok: true,
        bundled,
        fetched: parsed.length,
        fromCache: true,
      };
      return lastResult;
    } catch (e) {
      // Bundled catalog still serves instantly — warm is "done enough".
      warmDone = true;
      lastResult = {
        ok: true,
        bundled,
        fetched: 0,
        fromCache: true,
        error: e instanceof Error ? e.message : String(e),
      };
      return lastResult;
    }
  })();
  return warmPromise;
}

/** Test helper — reset warm state between vitest cases. */
export function resetClassicFairyTaleWarmForTests(): void {
  warmPromise = null;
  warmDone = false;
  lastResult = null;
  extras = [];
}
