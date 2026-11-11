'use client';
/**
 * Browser geolocation probe for the first-run confirm page.
 * Mirrors mic-preflight: call from a user gesture; never blocks chat entry.
 */
import type { LocationOutcome } from './entry-gate';
import { resolveDevicePlace, type GeoLike } from './live-tools';

export type { LocationOutcome };

export const LOCATION_PREFLIGHT_SESSION_KEY = 'amoji.locationPreflight.done';

function browserGeo(): GeoLike | null {
  if (typeof navigator === 'undefined') return null;
  const geo = navigator.geolocation;
  if (!geo || typeof geo.getCurrentPosition !== 'function') return null;
  return geo;
}

function safeStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function locationSupported(): boolean {
  return !!browserGeo();
}

export function setLocationPreflightDone(done: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (done) window.sessionStorage.setItem(LOCATION_PREFLIGHT_SESSION_KEY, '1');
    else window.sessionStorage.removeItem(LOCATION_PREFLIGHT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function locationPreflightDoneThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(LOCATION_PREFLIGHT_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Ask for device location once. On grant, caches the place for weather/news.
 * On deny, marks session deny so chat will not re-prompt.
 */
export async function requestLocation(): Promise<LocationOutcome> {
  const geo = browserGeo();
  if (!geo) return 'unsupported';
  const storage = safeStorage('local');
  const session = safeStorage('session');
  try {
    const beforeDeny = session?.getItem('amoji.geo.denied') === '1';
    const place = await resolveDevicePlace({
      fetch: globalThis.fetch.bind(globalThis),
      geolocation: geo,
      storage,
      session,
    });
    const denied = session?.getItem('amoji.geo.denied') === '1';
    if (denied && !beforeDeny) return 'denied';
    if (place?.source === 'browser') return 'granted';
    if (denied) return 'denied';
    // Timeout / unavailable — treat as soft deny so we do not keep nagging.
    return 'denied';
  } catch {
    return 'denied';
  } finally {
    setLocationPreflightDone(true);
  }
}
