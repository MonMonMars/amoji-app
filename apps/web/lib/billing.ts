'use client';
/**
 * Free daily quota + optional Stripe payment link.
 * No fake checkout: paid unlock appears only when a public payment link
 * (or production API entitlement) is configured.
 */

import {
  checkChatTurnQuota,
  dailyTurnLimit,
  dailyTurnsRemaining,
  dailyTurnsUsed,
  type QuotaGate,
} from './daily-quota';

export type PlanId = 'free' | 'plus';

export const BILLING_PLAN_KEY = 'amoji.plan.v1';
export const STRIPE_PAYMENT_LINK_ENV = 'NEXT_PUBLIC_STRIPE_PAYMENT_LINK';

export interface PlanRecord {
  plan: PlanId;
  /** ISO — when Plus was unlocked locally after a verified webhook sync */
  unlockedAt?: string;
  /** Soft local mirror of server entitlement expiry (optional) */
  expiresAt?: string;
}

function readPlan(): PlanRecord {
  if (typeof localStorage === 'undefined') return { plan: 'free' };
  try {
    const raw = localStorage.getItem(BILLING_PLAN_KEY);
    if (!raw) return { plan: 'free' };
    const parsed = JSON.parse(raw) as Partial<PlanRecord>;
    if (parsed.plan === 'plus') {
      if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) {
        return { plan: 'free' };
      }
      return {
        plan: 'plus',
        unlockedAt: typeof parsed.unlockedAt === 'string' ? parsed.unlockedAt : undefined,
        expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : undefined,
      };
    }
  } catch { /* ignore */ }
  return { plan: 'free' };
}

function writePlan(rec: PlanRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(BILLING_PLAN_KEY, JSON.stringify(rec));
  } catch { /* ignore */ }
}

export function currentPlan(): PlanId {
  return readPlan().plan;
}

export function setPlusPlanLocal(expiresAt?: string): void {
  writePlan({
    plan: 'plus',
    unlockedAt: new Date().toISOString(),
    ...(expiresAt ? { expiresAt } : {}),
  });
}

export function clearPlusPlanLocal(): void {
  writePlan({ plan: 'free' });
}

export function publicPaymentLink(): string {
  if (typeof process === 'undefined') return '';
  return (process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '').trim();
}

export function paymentsConfigured(): boolean {
  return publicPaymentLink().length > 0;
}

export interface PlanStatus {
  plan: PlanId;
  quota: QuotaGate;
  paymentsConfigured: boolean;
  paymentLink: string;
  /** Plus skips the soft daily gate. */
  chatAllowed: boolean;
}

export function planStatus(): PlanStatus {
  const plan = currentPlan();
  const quota = checkChatTurnQuota();
  const link = publicPaymentLink();
  return {
    plan,
    quota,
    paymentsConfigured: link.length > 0,
    paymentLink: link,
    chatAllowed: plan === 'plus' || quota.ok,
  };
}

export function planStatusSummary(): string {
  const s = planStatus();
  if (s.plan === 'plus') return 'Plus — unlimited chat turns on this device';
  return `Free — ${dailyTurnsRemaining()} / ${dailyTurnLimit()} turns left today (UTC)`;
}

export function usedToday(): number {
  return dailyTurnsUsed();
}

/** Pull Plus entitlement from the production API when configured. */
export async function syncEntitlementFromApi(): Promise<PlanId | null> {
  const base = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_AMOJI_API ?? '') : '').trim().replace(/\/$/, '');
  if (!base || typeof fetch === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    let token = '';
    try { token = localStorage.getItem('amoji.backend.session') ?? ''; } catch { token = ''; }
    if (!token) {
      const created = await fetch(`${base}/api/auth/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!created.ok) return null;
      const data = await created.json() as { token?: unknown };
      if (typeof data.token !== 'string' || !data.token) return null;
      token = data.token;
      try { localStorage.setItem('amoji.backend.session', token); } catch { /* ignore */ }
    }
    const res = await fetch(`${base}/api/billing/entitlement`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      try { localStorage.removeItem('amoji.backend.session'); } catch { /* ignore */ }
      return null;
    }
    if (!res.ok) return null;
    const body = await res.json() as { plan?: unknown; expiresAt?: unknown };
    if (body.plan === 'plus') {
      const expiresAt = typeof body.expiresAt === 'number'
        ? new Date(body.expiresAt).toISOString()
        : undefined;
      setPlusPlanLocal(expiresAt);
      return 'plus';
    }
    clearPlusPlanLocal();
    return 'free';
  } catch {
    return null;
  }
}
