/**
 * Optional production-API storage wipe. Pages builds without
 * NEXT_PUBLIC_AMOJI_API never call this — the UI stays honest.
 */

import { productionApiConfigured } from './systems-catalog';

export function storageApiConfigured(): boolean {
  return productionApiConfigured();
}

export async function wipeServerProductData(): Promise<{ ok: boolean; removed?: string[]; error?: string }> {
  const base = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_AMOJI_API : '')?.trim() ?? '';
  if (!base) return { ok: false, error: 'no-api' };
  let token = '';
  try {
    token = localStorage.getItem('amoji.backend.session') ?? '';
  } catch {
    token = '';
  }
  if (!token) return { ok: false, error: 'no-session' };
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/storage/me`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return { ok: false, error: body.error ?? `http-${res.status}` };
    }
    const body = await res.json() as { removed?: string[] };
    return { ok: true, removed: body.removed ?? [] };
  } catch {
    return { ok: false, error: 'network' };
  }
}
