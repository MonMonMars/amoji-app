/**
 * Payment rules — when payment is required, how checkout opens, and how
 * success / cancel / demo returns are handled. Complements charging-rules.ts.
 *
 * Live money moves only through Stripe (Payment Link or Checkout Session) when
 * secrets are configured. Demo mode never charges; it is labeled in the UI.
 */

import { CHARGING_RULES, formatPlanPrice, plusExpiresAtIso } from './charging-rules';

export const PAYMENT_RETURN_PARAM = 'amoji_pay';
export const PAYMENT_CLIENT_ID_KEY = 'amoji.billing.clientId';
export const PAYMENT_DEMO_ENV = 'NEXT_PUBLIC_AMOJI_PAYMENT_DEMO';
export type PaymentReturnKind = 'success' | 'cancel' | 'demo';

export interface PaymentRulesConfig {
  version: number;
  /** Query param written on return URLs. */
  returnParam: typeof PAYMENT_RETURN_PARAM;
  /** Stripe Payment Link query keys we append when opening checkout. */
  linkQuery: {
    clientReferenceId: 'client_reference_id';
  };
  messages: {
    success: string;
    cancel: string;
    demo: string;
    notConfigured: string;
  };
}

export const PAYMENT_RULES: PaymentRulesConfig = {
  version: 1,
  returnParam: PAYMENT_RETURN_PARAM,
  linkQuery: { clientReferenceId: 'client_reference_id' },
  messages: {
    success:
      'Payment return received. Syncing Plus entitlement from the production API when configured.',
    cancel: 'Checkout was cancelled. No charge was made. Free plan limits still apply.',
    demo:
      'Demo Plus unlock — no real money moved. Set NEXT_PUBLIC_AMOJI_PAYMENT_DEMO=0 (or unset) to disable.',
    notConfigured:
      'Payments stay off until NEXT_PUBLIC_STRIPE_PAYMENT_LINK (and server STRIPE_* secrets for webhook unlock) are set.',
  },
};

export function paymentDemoMode(): boolean {
  if (typeof process === 'undefined') return false;
  const v = (process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Upgrade UI may show when a live link exists or demo mode is on. */
export function upgradeOffered(paymentsConfigured: boolean): boolean {
  return paymentsConfigured || paymentDemoMode();
}

/**
 * Payment is required only when the free plan would block an LLM chat turn
 * and the user has no Plus. BYOK / free features never require payment.
 */
export function paymentRequiredForChat(opts: {
  plan: 'free' | 'plus';
  chatAllowed: boolean;
}): boolean {
  if (opts.plan === 'plus') return false;
  return !opts.chatAllowed;
}

export function readPaymentReturn(search: string | URLSearchParams): PaymentReturnKind | null {
  const params = typeof search === 'string' ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search) : search;
  const raw = (params.get(PAYMENT_RETURN_PARAM) ?? '').trim().toLowerCase();
  if (raw === 'success' || raw === 'cancel' || raw === 'demo') return raw;
  return null;
}

export function paymentReturnMessage(kind: PaymentReturnKind): string {
  return PAYMENT_RULES.messages[kind];
}

/** Stable anonymous id for Payment Link client_reference_id when no API user yet. */
export function billingClientId(): string {
  if (typeof localStorage === 'undefined') return 'anon-ssr';
  try {
    const existing = localStorage.getItem(PAYMENT_CLIENT_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PAYMENT_CLIENT_ID_KEY, id);
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

/**
 * Build a Stripe Payment Link URL with client_reference_id so the webhook can
 * map checkout.session.completed → entitlements.user_id.
 */
export function buildStripePaymentLinkUrl(
  baseLink: string,
  clientReferenceId: string,
): string {
  const trimmed = baseLink.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    u.searchParams.set(PAYMENT_RULES.linkQuery.clientReferenceId, clientReferenceId);
    return u.toString();
  } catch {
    const join = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${join}${PAYMENT_RULES.linkQuery.clientReferenceId}=${encodeURIComponent(clientReferenceId)}`;
  }
}

export function plusCatalogBlurb(): string {
  const plus = CHARGING_RULES.plans.plus;
  const price = formatPlanPrice(plus);
  const days = plus.durationDays ?? 30;
  return `Amoji Plus — ${price} catalog / ${days} days unlimited chat turns (Stripe charges the live link price when configured).`;
}

export function demoPlusExpiresAt(): string {
  return plusExpiresAtIso();
}

export function paymentRulesSnapshot(paymentsConfigured: boolean) {
  return {
    version: PAYMENT_RULES.version,
    paymentsConfigured,
    demoMode: paymentDemoMode(),
    upgradeOffered: upgradeOffered(paymentsConfigured),
    returnParam: PAYMENT_RETURN_PARAM,
    catalog: plusCatalogBlurb(),
  };
}
