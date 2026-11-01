'use client';
/**
 * Versioned first-run Privacy + Terms acceptance.
 * Bump LEGAL_ACCEPT_VERSION when policy copy changes to re-prompt.
 * Demo / placeholder legal text — not final lawyer copy.
 */

export const LEGAL_ACCEPT_VERSION = 1;
export const LEGAL_ACCEPT_KEY = 'amoji.legalAccept.v1';
const EVENT = 'amoji:legal-accept';

export type LegalAcceptRecord = {
  version: number;
  acceptedAt: string; // ISO
};

function readRaw(): LegalAcceptRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGAL_ACCEPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegalAcceptRecord>;
    if (typeof parsed.version !== 'number' || typeof parsed.acceptedAt !== 'string') return null;
    return { version: parsed.version, acceptedAt: parsed.acceptedAt };
  } catch {
    return null;
  }
}

/** True when the user accepted the current LEGAL_ACCEPT_VERSION. */
export function hasAcceptedCurrentLegal(): boolean {
  const rec = readRaw();
  return !!rec && rec.version === LEGAL_ACCEPT_VERSION;
}

export function getLegalAcceptRecord(): LegalAcceptRecord | null {
  return readRaw();
}

/** Persist acceptance for the current policy version. */
export function acceptCurrentLegal(): void {
  if (typeof window === 'undefined') return;
  const rec: LegalAcceptRecord = {
    version: LEGAL_ACCEPT_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(LEGAL_ACCEPT_KEY, JSON.stringify(rec));
  } catch {
    /* ignore quota / private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: rec }));
  } catch {
    /* ignore */
  }
}

/** Same-tab + cross-tab subscription for gate UI. */
export function subscribeLegalAccept(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === LEGAL_ACCEPT_KEY) cb();
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
