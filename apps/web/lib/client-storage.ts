/**
 * Inventory of browser keys Amoji owns, plus a bounded wipe helper for
 * Settings → Memory & data / Systems.
 */

export interface ClientStorageKey {
  key: string;
  kind: 'local' | 'session';
  purpose: string;
  sensitive?: boolean;
}

/** Keys the product intentionally writes. Keep in sync with docs/SYSTEMS.md. */
export const CLIENT_STORAGE_KEYS: ClientStorageKey[] = [
  { key: 'amoji.prefs.v1', kind: 'local', purpose: 'Language, volumes, companion, scene' },
  { key: 'amoji.memory.v2', kind: 'local', purpose: 'Long-term memory + diary' },
  { key: 'amoji.profile.v1', kind: 'local', purpose: 'Display name + gender tone' },
  { key: 'amoji.history.v1', kind: 'local', purpose: 'Chat transcript' },
  { key: 'amoji.config.v1', kind: 'local', purpose: 'Legacy config blob' },
  { key: 'amoji.legalAccept.v1', kind: 'local', purpose: 'Privacy + Terms acceptance' },
  { key: 'amoji.dailyTurns.v1', kind: 'local', purpose: 'Free daily chat quota' },
  { key: 'amoji.plan.v1', kind: 'local', purpose: 'Free / Plus entitlement mirror' },
  { key: 'amoji.reports.v1', kind: 'local', purpose: 'In-app content reports' },
  { key: 'amoji.backend.session', kind: 'local', purpose: 'Optional production API bearer', sensitive: true },
  { key: 'amoji.modular.v1', kind: 'local', purpose: 'Modular wardrobe picks' },
];

export function listPresentClientKeys(): ClientStorageKey[] {
  if (typeof localStorage === 'undefined') return [];
  const present: ClientStorageKey[] = [];
  for (const entry of CLIENT_STORAGE_KEYS) {
    try {
      const store = entry.kind === 'local' ? localStorage : sessionStorage;
      if (store.getItem(entry.key) != null) present.push(entry);
    } catch {
      /* private mode */
    }
  }
  return present;
}

/** Wipe product localStorage keys except legal acceptance (re-gate stays intentional). */
export function wipeClientProductData(opts?: { keepLegal?: boolean }): string[] {
  if (typeof localStorage === 'undefined') return [];
  const keepLegal = opts?.keepLegal !== false;
  const removed: string[] = [];
  for (const entry of CLIENT_STORAGE_KEYS) {
    if (keepLegal && entry.key === 'amoji.legalAccept.v1') continue;
    if (entry.kind !== 'local') continue;
    try {
      if (localStorage.getItem(entry.key) != null) {
        localStorage.removeItem(entry.key);
        removed.push(entry.key);
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}
