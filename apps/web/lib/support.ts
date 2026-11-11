'use client';
/**
 * Support contact helper — posts to the optional production API.
 * Pages builds leave NEXT_PUBLIC_AMOJI_API unset, so the UI must keep an
 * honest local/GitHub-issues path when this returns attempted:false.
 */

import { productionApiBase } from './backend-client';

export const MAX_SUPPORT_MESSAGE = 2000;

export interface SupportInput {
  email: string;
  message: string;
}

export interface SupportResult {
  attempted: boolean;
  ok: boolean;
  stored?: boolean;
  emailed?: boolean;
  skipped?: boolean;
  opsNotified?: boolean;
  mailConfigured?: boolean;
  error?: string;
}

function looksLikeEmail(v: string): boolean {
  const s = v.trim();
  return s.length >= 5 && s.includes('@') && !s.includes(' ');
}

/** Best-effort POST /api/support. Never invents success when the API is unset. */
export async function submitSupportMessage(input: SupportInput): Promise<SupportResult> {
  const base = productionApiBase();
  if (!base || typeof fetch === 'undefined') {
    return { attempted: false, ok: false, error: 'no production api' };
  }
  const email = input.email.trim().slice(0, 200);
  const message = input.message.trim().slice(0, MAX_SUPPORT_MESSAGE);
  if (!looksLikeEmail(email) || !message) {
    return { attempted: false, ok: false, error: 'invalid input' };
  }
  try {
    const res = await fetch(`${base}/api/support`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, message }),
    });
    if (!res.ok) {
      return { attempted: true, ok: false, error: `http ${res.status}` };
    }
    const data = await res.json() as {
      stored?: unknown;
      emailed?: unknown;
      skipped?: unknown;
      opsNotified?: unknown;
      mailConfigured?: unknown;
    };
    return {
      attempted: true,
      ok: true,
      stored: data.stored === true,
      emailed: data.emailed === true,
      skipped: data.skipped === true,
      opsNotified: data.opsNotified === true,
      mailConfigured: data.mailConfigured === true,
    };
  } catch (err) {
    return {
      attempted: true,
      ok: false,
      error: err instanceof Error ? err.message : 'network',
    };
  }
}

export function supportApiConfigured(): boolean {
  return !!productionApiBase();
}
