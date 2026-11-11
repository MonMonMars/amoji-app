'use client';
/**
 * Free daily quota + optional Stripe payment link / demo unlock.
 * No silent fake checkout: paid unlock appears only when a public payment link
 * (or production API entitlement) is configured, or when payment demo mode is
 * explicitly enabled (NEXT_PUBLIC_AMOJI_PAYMENT_DEMO=1) — demo never charges.
 */

import {
  checkChatTurnQuota,
  dailyTurnLimit,
  dailyTurnsRemaining,
  dailyTurnsUsed,
  type QuotaGate,
} from './daily-quota';
import { CHARGING_RULES, chargingRulesSnapshot, plusExpiresAtIso } from './charging-rules';
import {
  PAYMENT_CLIENT_ID_KEY,
  billingClientId,
  buildStripePaymentLinkUrl,
  demoPlusExpiresAt,
  paymentDemoMode,
  paymentRequiredForChat,
  paymentReturnMessage,
  paymentRulesSnapshot,
  readPaymentReturn,
  upgradeOffered,
  type PaymentReturnKind,
} from './payment-rules';

export type PlanId = 'free' | 'plus';

export const BILLING_PLAN_KEY = 'amoji.plan.v1';
export const STRIPE_PAYMENT_LINK_ENV = 'NEXT_PUBLIC_STRIPE_PAYMENT_LINK';

export interface PlanRecord {
  plan: PlanId;
  /** ISO — when Plus was unlocked locally after a verified webhook sync / demo */
  unlockedAt?: string;
  /** Soft local mirror of server entitlement expiry (optional) */
  expiresAt?: string;
  /** How Plus was unlocked on this device */
  source?: 'stripe' | 'demo' | 'api';
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
        source: parsed.source === 'demo' || parsed.source === 'api' || parsed.source === 'stripe'
          ? parsed.source
          : undefined,
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

export function currentPlanRecord(): PlanRecord {
  return readPlan();
}

export function setPlusPlanLocal(expiresAt?: string, source: PlanRecord['source'] = 'stripe'): void {
  writePlan({
    plan: 'plus',
    unlockedAt: new Date().toISOString(),
    expiresAt: expiresAt ?? plusExpiresAtIso(),
    source,
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

export function paymentsOrDemoAvailable(): boolean {
  return upgradeOffered(paymentsConfigured());
}

export interface PlanStatus {
  plan: PlanId;
  quota: QuotaGate;
  paymentsConfigured: boolean;
  paymentLink: string;
  demoMode: boolean;
  upgradeOffered: boolean;
  /** Plus skips the soft daily gate. */
  chatAllowed: boolean;
  /** True when free quota is exhausted and chat would need payment or wait. */
  paymentRequired: boolean;
  source?: PlanRecord['source'];
  expiresAt?: string;
}

export function planStatus(): PlanStatus {
  const rec = readPlan();
  const plan = rec.plan;
  const quota = checkChatTurnQuota();
  const link = publicPaymentLink();
  const configured = link.length > 0;
  const demo = paymentDemoMode();
  const chatAllowed = plan === 'plus' || quota.ok;
  return {
    plan,
    quota,
    paymentsConfigured: configured,
    paymentLink: link,
    demoMode: demo,
    upgradeOffered: upgradeOffered(configured),
    chatAllowed,
    paymentRequired: paymentRequiredForChat({ plan, chatAllowed }),
    source: rec.source,
    expiresAt: rec.expiresAt,
  };
}

export function planStatusSummary(): string {
  const s = planStatus();
  if (s.plan === 'plus') {
    const demoTag = s.source === 'demo' ? ' (demo — no charge)' : '';
    return `Plus — unlimited chat turns on this device${demoTag}`;
  }
  return `Free — ${dailyTurnsRemaining()} / ${dailyTurnLimit()} turns left today (UTC)`;
}

export function usedToday(): number {
  return dailyTurnsUsed();
}

/** Stripe Payment Link with client_reference_id for webhook mapping. */
export function checkoutPaymentUrl(clientReferenceId?: string): string {
  const base = publicPaymentLink();
  if (!base) return '';
  return buildStripePaymentLinkUrl(base, clientReferenceId ?? billingClientId());
}

/**
 * Prefer API checkout (session + optional Stripe Checkout Session); fall back
 * to the public Payment Link with client_reference_id. Demo mode unlocks locally.
 */
export async function startCheckout(): Promise<{
  ok: boolean;
  mode: 'link' | 'session' | 'demo' | 'none';
  url?: string;
  error?: string;
}> {
  if (paymentDemoMode() && !paymentsConfigured()) {
    applyDemoPlusUnlock();
    return { ok: true, mode: 'demo' };
  }

  const base = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_AMOJI_API ?? '') : '').trim().replace(/\/$/, '');
  if (base && typeof fetch !== 'undefined') {
    try {
      const token = await ensureApiSessionToken(base);
      if (token) {
        const res = await fetch(`${base}/api/billing/checkout`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            clientId: billingClientId(),
            returnOrigin: typeof window !== 'undefined' ? window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : undefined,
          }),
        });
        if (res.ok) {
          const body = await res.json() as {
            mode?: string;
            url?: string;
            plan?: string;
            expiresAt?: number | string;
          };
          if (body.mode === 'demo') {
            const expires = typeof body.expiresAt === 'number'
              ? new Date(body.expiresAt).toISOString()
              : typeof body.expiresAt === 'string'
                ? body.expiresAt
                : demoPlusExpiresAt();
            setPlusPlanLocal(expires, 'demo');
            return { ok: true, mode: 'demo' };
          }
          if (typeof body.url === 'string' && body.url) {
            return {
              ok: true,
              mode: body.mode === 'session' ? 'session' : 'link',
              url: body.url,
            };
          }
        }
      }
    } catch {
      /* fall through to public link */
    }
  }

  const url = checkoutPaymentUrl();
  if (url) return { ok: true, mode: 'link', url };
  if (paymentDemoMode()) {
    applyDemoPlusUnlock();
    return { ok: true, mode: 'demo' };
  }
  return { ok: false, mode: 'none', error: 'payments not configured' };
}

export function applyDemoPlusUnlock(): void {
  setPlusPlanLocal(demoPlusExpiresAt(), 'demo');
}

async function ensureApiSessionToken(base: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  let token = '';
  try { token = localStorage.getItem('amoji.backend.session') ?? ''; } catch { token = ''; }
  if (token) return token;
  try {
    const created = await fetch(`${base}/api/auth/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!created.ok) return null;
    const data = await created.json() as { token?: unknown };
    if (typeof data.token !== 'string' || !data.token) return null;
    try { localStorage.setItem('amoji.backend.session', data.token); } catch { /* ignore */ }
    return data.token;
  } catch {
    return null;
  }
}

/** Pull Plus entitlement from the production API when configured. */
export async function syncEntitlementFromApi(): Promise<PlanId | null> {
  const base = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_AMOJI_API ?? '') : '').trim().replace(/\/$/, '');
  if (!base || typeof fetch === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const token = await ensureApiSessionToken(base);
    if (!token) return null;
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
      setPlusPlanLocal(expiresAt, 'api');
      return 'plus';
    }
    // Do not clear a local demo unlock when API reports free (demo is Pages-local).
    if (readPlan().source === 'demo') return 'plus';
    clearPlusPlanLocal();
    return 'free';
  } catch {
    return null;
  }
}

export interface PaymentReturnResult {
  kind: PaymentReturnKind;
  message: string;
  plan: PlanId;
}

/**
 * Handle ?amoji_pay=success|cancel|demo — strip the param from the URL and
 * sync entitlement (success) or apply labeled demo unlock.
 */
export async function handlePaymentReturn(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): Promise<PaymentReturnResult | null> {
  const kind = readPaymentReturn(search);
  if (!kind) return null;
  if (kind === 'demo' || (kind === 'success' && paymentDemoMode() && !paymentsConfigured())) {
    applyDemoPlusUnlock();
  }
  if (kind === 'success') {
    await syncEntitlementFromApi();
  }
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('amoji_pay');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch { /* ignore */ }
  }
  return {
    kind,
    message: paymentReturnMessage(kind),
    plan: currentPlan(),
  };
}

export function billingSnapshot() {
  const status = planStatus();
  return {
    plan: status.plan,
    chatAllowed: status.chatAllowed,
    paymentRequired: status.paymentRequired,
    charging: chargingRulesSnapshot(),
    payment: paymentRulesSnapshot(status.paymentsConfigured),
    catalogPrice: CHARGING_RULES.plans.plus,
    clientIdKey: PAYMENT_CLIENT_ID_KEY,
  };
}
