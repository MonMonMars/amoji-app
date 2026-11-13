/**
 * Inventory of browser keys Amoji owns, plus export / wipe helpers for
 * Settings → Memory & data / Systems. Keep in sync with docs/SYSTEMS.md.
 */

export const STORAGE_RULES_VERSION = 1;

export interface ClientStorageKey {
  key: string;
  kind: 'local' | 'session';
  purpose: string;
  sensitive?: boolean;
  /** When true, wipeProductData removes it (local keys only). */
  wipeable?: boolean;
}

/** Fixed keys the product intentionally writes. */
export const CLIENT_STORAGE_KEYS: ClientStorageKey[] = [
  { key: 'amoji.prefs.v1', kind: 'local', purpose: 'Language, volumes, companion, scene', wipeable: true },
  { key: 'amoji.memory.v2', kind: 'local', purpose: 'Long-term memory + diary', wipeable: true },
  { key: 'amoji.memory.v1', kind: 'local', purpose: 'Legacy memory blob', wipeable: true },
  { key: 'amoji.profile.v1', kind: 'local', purpose: 'Display name + gender tone', wipeable: true },
  { key: 'amoji.history.v1', kind: 'local', purpose: 'Chat transcript', wipeable: true },
  { key: 'amoji.config.v1', kind: 'local', purpose: 'Legacy config blob', wipeable: true },
  { key: 'amoji.legalAccept.v1', kind: 'local', purpose: 'Privacy + Terms acceptance', wipeable: false },
  { key: 'amoji.dailyTurns.v1', kind: 'local', purpose: 'Free daily chat quota', wipeable: true },
  { key: 'amoji.plan.v1', kind: 'local', purpose: 'Free / Plus entitlement mirror', wipeable: true },
  { key: 'amoji.billing.clientId', kind: 'local', purpose: 'Anonymous id for Stripe client_reference_id', wipeable: true },
  { key: 'amoji.reports.v1', kind: 'local', purpose: 'In-app content reports', wipeable: true },
  { key: 'amoji.backend.session', kind: 'local', purpose: 'Optional production API bearer', sensitive: true, wipeable: true },
  { key: 'amoji.modular.v1', kind: 'local', purpose: 'Modular wardrobe picks', wipeable: true },
  { key: 'amoji.personality.v1', kind: 'local', purpose: 'Legacy personality cache', wipeable: true },
  { key: 'amoji.personality.v2', kind: 'local', purpose: 'Personality profile cache', wipeable: true },
  { key: 'amoji.voice.v1', kind: 'local', purpose: 'Voice mute on/off', wipeable: true },
  { key: 'amoji.neural.v1', kind: 'local', purpose: 'Neural TTS preference', wipeable: true },
  { key: 'amoji.mute.v1', kind: 'local', purpose: 'Master mute', wipeable: true },
  { key: 'amoji.place.v1', kind: 'local', purpose: 'Cached place / weather locale', wipeable: true },
  { key: 'amoji.place.manual.v1', kind: 'local', purpose: 'User-entered city', wipeable: true },
  { key: 'amoji.idleEnabled.v1', kind: 'local', purpose: 'Idle clip rotation enable map', wipeable: true },
  { key: 'amoji.idlePick.v1', kind: 'local', purpose: 'Per-character idle pick', wipeable: true },
  { key: 'amoji.cmaReactionSfx.picks.v1', kind: 'local', purpose: 'CMA reaction SFX gallery picks', wipeable: true },
  { key: 'amoji.emotionClips.v1', kind: 'local', purpose: 'Emotion clip picks', wipeable: true },
  { key: 'amoji.osVoice.v1', kind: 'local', purpose: 'OS voice picks', wipeable: true },
  { key: 'amoji.entryGate.v1', kind: 'local', purpose: 'Entry / setup gate progress', wipeable: true },
  { key: 'amoji.openPhase.v1', kind: 'local', purpose: 'Open-phase tutorial progress', wipeable: true },
  { key: 'amoji.ttsproxy.v1', kind: 'local', purpose: 'Saved TTS proxy URL', wipeable: true },
  { key: 'amoji.openai.key', kind: 'local', purpose: 'BYOK OpenAI TTS key', sensitive: true, wipeable: true },
  { key: 'amoji.openai.endpoint', kind: 'local', purpose: 'OpenAI TTS proxy endpoint', wipeable: true },
  { key: 'amoji.openai.enabled', kind: 'local', purpose: 'OpenAI TTS enabled flag', wipeable: true },
  { key: 'amoji.brain.provider', kind: 'local', purpose: 'Advanced brain provider choice', wipeable: true },
  { key: 'amoji.ovhSticky.v1', kind: 'session', purpose: 'Sticky OVH model lane (tab-scoped)' },
  { key: 'amoji.noApiRoute', kind: 'session', purpose: 'Remember failed API route (tab-scoped)' },
  { key: 'amoji.geo.denied', kind: 'session', purpose: 'Geolocation denied this tab' },
  { key: 'amoji.geo.primed', kind: 'session', purpose: 'Browser geo prompt already fired this tab' },
  { key: 'amoji.navReturn', kind: 'session', purpose: 'Back-nav return path' },
  { key: 'amoji.selectReturn', kind: 'session', purpose: 'Select-page return path' },
];

/** Dynamic localStorage prefixes (keys are enumerated at export/wipe time). */
export const CLIENT_STORAGE_PREFIXES: Array<{
  prefix: string;
  purpose: string;
  sensitive?: boolean;
  wipeable?: boolean;
}> = [
  { prefix: 'amoji.brain.key.', purpose: 'BYOK brain API keys', sensitive: true, wipeable: true },
  { prefix: 'amoji.thumb.', purpose: 'Model thumbnail data URLs', wipeable: true },
  { prefix: 'amoji.idleEnabled.v1.', purpose: 'Per-companion idle enable overrides', wipeable: true },
];

export interface StorageClientStatus {
  version: number;
  presentLocal: number;
  presentSession: number;
  estimatedBytes: number;
  productionApi: boolean;
  posture: string;
}

function storeOf(kind: 'local' | 'session'): Storage | null {
  try {
    if (kind === 'local') {
      if (typeof localStorage === 'undefined') return null;
      return localStorage;
    }
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function listPresentClientKeys(): ClientStorageKey[] {
  const present: ClientStorageKey[] = [];
  for (const entry of CLIENT_STORAGE_KEYS) {
    const store = storeOf(entry.kind);
    if (!store) continue;
    try {
      if (store.getItem(entry.key) != null) present.push(entry);
    } catch {
      /* private mode */
    }
  }
  const local = storeOf('local');
  if (local) {
    try {
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (!key) continue;
        for (const p of CLIENT_STORAGE_PREFIXES) {
          if (key.startsWith(p.prefix) && !present.some((e) => e.key === key)) {
            present.push({
              key,
              kind: 'local',
              purpose: p.purpose,
              sensitive: p.sensitive,
              wipeable: p.wipeable,
            });
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return present;
}

export function estimateClientStorageBytes(): number {
  let total = 0;
  for (const kind of ['local', 'session'] as const) {
    const store = storeOf(kind);
    if (!store) continue;
    try {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key || !key.startsWith('amoji.')) continue;
        const val = store.getItem(key) ?? '';
        total += key.length + val.length;
      }
    } catch {
      /* ignore */
    }
  }
  return total;
}

export function storageClientStatus(productionApi: boolean): StorageClientStatus {
  const present = listPresentClientKeys();
  const presentLocal = present.filter((k) => k.kind === 'local').length;
  const presentSession = present.filter((k) => k.kind === 'session').length;
  const estimatedBytes = estimateClientStorageBytes();
  return {
    version: STORAGE_RULES_VERSION,
    presentLocal,
    presentSession,
    estimatedBytes,
    productionApi,
    posture: productionApi
      ? 'Browser keys listed below. Optional Node API may also hold anonymous session + companion/chat rows — use Wipe (API) when signed in with a bearer.'
      : 'All primary companion state is on this device (localStorage / sessionStorage). No production API is configured for this build.',
  };
}

/** Wipe product localStorage keys except legal acceptance (re-gate stays intentional). */
export function wipeClientProductData(opts?: { keepLegal?: boolean }): string[] {
  if (typeof localStorage === 'undefined') return [];
  const keepLegal = opts?.keepLegal !== false;
  const removed: string[] = [];
  const tryRemove = (key: string) => {
    try {
      if (localStorage.getItem(key) != null) {
        localStorage.removeItem(key);
        removed.push(key);
      }
    } catch {
      /* ignore */
    }
  };
  for (const entry of CLIENT_STORAGE_KEYS) {
    if (entry.kind !== 'local') continue;
    if (keepLegal && entry.key === 'amoji.legalAccept.v1') continue;
    if (entry.wipeable === false) continue;
    tryRemove(entry.key);
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const p of CLIENT_STORAGE_PREFIXES) {
        if (p.wipeable !== false && key.startsWith(p.prefix)) tryRemove(key);
      }
    }
  } catch {
    /* ignore */
  }
  return removed;
}

const REDACTED = '[redacted]';

export interface ProductDataExport {
  exportedAt: string;
  storageRulesVersion: number;
  keys: Array<{ key: string; kind: 'local' | 'session'; purpose: string; value: unknown }>;
}

function parseMaybeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/** Export product keys as JSON. Sensitive values are redacted. */
export function exportProductData(): ProductDataExport {
  const keys: ProductDataExport['keys'] = [];
  const seen = new Set<string>();
  for (const entry of CLIENT_STORAGE_KEYS) {
    const store = storeOf(entry.kind);
    if (!store) continue;
    try {
      const raw = store.getItem(entry.key);
      if (raw == null) continue;
      seen.add(`${entry.kind}:${entry.key}`);
      keys.push({
        key: entry.key,
        kind: entry.kind,
        purpose: entry.purpose,
        value: entry.sensitive ? REDACTED : parseMaybeJson(raw),
      });
    } catch {
      /* ignore */
    }
  }
  const local = storeOf('local');
  if (local) {
    try {
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (!key) continue;
        for (const p of CLIENT_STORAGE_PREFIXES) {
          if (!key.startsWith(p.prefix)) continue;
          const id = `local:${key}`;
          if (seen.has(id)) continue;
          const raw = local.getItem(key);
          if (raw == null) continue;
          seen.add(id);
          keys.push({
            key,
            kind: 'local',
            purpose: p.purpose,
            value: p.sensitive ? REDACTED : parseMaybeJson(raw),
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    storageRulesVersion: STORAGE_RULES_VERSION,
    keys,
  };
}

export function downloadProductDataExport(): void {
  const payload = exportProductData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amoji-product-data-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
