/**
 * Browser-side helpers that assemble helpline location hints.
 *
 * Kept out of `crisis.ts` so the pure detector stays free of live-tools /
 * localStorage side effects and stays easy to unit-test.
 *
 * Precedence is owned by `resolveHelplineRegion` in crisis.ts:
 *   realtime → register → download → app lang
 */
import {
  countryToHelplineRegion,
  downloadRegionFromLocale,
  resolveHelplineRegion,
  type HelplineLocationHints,
  type HelplineRegion,
} from './crisis';
import { lastDevicePlace, manualPlace } from './live-tools';
import { loadPrefs, savePrefs, type Lang, type Prefs } from './prefs';

function countryHintFromPlace(place: { countryCode?: string; country?: string } | null): string | null {
  if (!place) return null;
  if (place.countryCode && countryToHelplineRegion(place.countryCode)) {
    return place.countryCode.toUpperCase();
  }
  if (place.country && countryToHelplineRegion(place.country)) {
    return place.country;
  }
  return null;
}

/** Stamp downloadRegion once from the browser / store locale if missing. */
export function ensureDownloadRegion(prefs: Prefs, locale?: string | null): Prefs {
  if (prefs.downloadRegion && countryToHelplineRegion(prefs.downloadRegion)) {
    return prefs;
  }
  let inferred: string | null = null;
  try {
    const loc = locale
      ?? (typeof navigator !== 'undefined'
        ? (navigator.languages?.[0] || navigator.language || null)
        : null);
    inferred = downloadRegionFromLocale(loc);
  } catch {
    inferred = null;
  }
  if (!inferred) return prefs;
  const next: Prefs = { ...prefs, downloadRegion: inferred };
  try { savePrefs(next); } catch { /* ignore */ }
  return next;
}

/**
 * Sync snapshot of every hint the resolver understands.
 * Safe to call from ChatPanel / face before any model work.
 */
export function readHelplineLocationHints(lang?: Lang | string | null): HelplineLocationHints {
  let prefs: Prefs | null = null;
  try {
    prefs = ensureDownloadRegion(loadPrefs());
  } catch {
    prefs = null;
  }
  const device = (() => {
    try { return lastDevicePlace(); } catch { return null; }
  })();
  const manual = (() => {
    try { return manualPlace(); } catch { return null; }
  })();
  return {
    realtimeCountry: countryHintFromPlace(device),
    // Register = explicit prefs field, else the city the user pinned in Settings.
    registerRegion: prefs?.registerRegion
      || countryHintFromPlace(manual)
      || null,
    downloadRegion: prefs?.downloadRegion || null,
    lang: lang ?? prefs?.lang ?? null,
  };
}

export function currentHelplineRegion(lang?: Lang | string | null): HelplineRegion {
  return resolveHelplineRegion(readHelplineLocationHints(lang));
}

/** Persist a user-declared register region (ISO or country name). */
export function setRegisterRegion(region: string | null | undefined): void {
  try {
    const prefs = loadPrefs();
    const cleaned = (region ?? '').trim();
    const next: Prefs = { ...prefs };
    if (!cleaned) {
      delete next.registerRegion;
    } else {
      next.registerRegion = cleaned;
    }
    savePrefs(next);
  } catch { /* ignore */ }
}
