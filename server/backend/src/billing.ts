import type { DatabaseSync } from 'node:sqlite';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { autoReply } from './auto-reply.js';
import { sendMail } from './email.js';
import { CHARGING_RULES, plusDurationMs } from './charging-rules.js';

export interface Entitlement {
  userId: string;
  plan: 'free' | 'plus';
  expiresAt: number | null;
  updatedAt: number;
}

export function stripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function billingDemoMode(): boolean {
  const v = (process.env.AMOJI_BILLING_DEMO ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function publicPaymentLink(): string {
  return (process.env.STRIPE_PAYMENT_LINK ?? process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '').trim();
}

export function buildPaymentLinkUrl(base: string, clientReferenceId: string): string {
  const trimmed = base.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    u.searchParams.set('client_reference_id', clientReferenceId);
    return u.toString();
  } catch {
    const join = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${join}client_reference_id=${encodeURIComponent(clientReferenceId)}`;
  }
}

export interface CheckoutResult {
  ok: boolean;
  status: number;
  mode?: 'link' | 'session' | 'demo' | 'none';
  url?: string;
  plan?: 'free' | 'plus';
  expiresAt?: number | null;
  error?: string;
  chargesRealMoney?: boolean;
}

/**
 * Start Plus checkout for an authenticated user.
 * - Demo: grants Plus locally in SQLite without Stripe (AMOJI_BILLING_DEMO=1).
 * - Stripe Checkout Session when STRIPE_SECRET_KEY + STRIPE_PRICE_ID are set.
 * - Otherwise Payment Link with client_reference_id=userId.
 */
export async function startCheckout(
  db: DatabaseSync,
  userId: string,
  now: number,
  opts?: { returnOrigin?: string; clientId?: string },
): Promise<CheckoutResult> {
  const ref = userId || opts?.clientId || '';
  if (billingDemoMode() && !stripeConfigured() && !publicPaymentLink()) {
    const expires = now + plusDurationMs();
    upsertPlus(db, userId, now, expires);
    return {
      ok: true,
      status: 200,
      mode: 'demo',
      plan: 'plus',
      expiresAt: expires,
      chargesRealMoney: false,
    };
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
  const priceId = process.env.STRIPE_PRICE_ID?.trim() ?? '';
  const origin = (opts?.returnOrigin ?? process.env.AMOJI_PUBLIC_ORIGIN ?? '').trim().replace(/\/$/, '');

  if (secret && priceId) {
    try {
      const params = new URLSearchParams();
      params.set('mode', 'payment');
      params.set('success_url', `${origin || 'http://127.0.0.1:3000'}?amoji_pay=success`);
      params.set('cancel_url', `${origin || 'http://127.0.0.1:3000'}?amoji_pay=cancel`);
      params.set('client_reference_id', ref);
      params.set('metadata[userId]', userId);
      params.set('line_items[0][price]', priceId);
      params.set('line_items[0][quantity]', '1');
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return { ok: false, status: 502, error: `stripe session failed: ${detail.slice(0, 200)}` };
      }
      const body = await res.json() as { url?: unknown };
      if (typeof body.url !== 'string' || !body.url) {
        return { ok: false, status: 502, error: 'stripe session missing url' };
      }
      return { ok: true, status: 200, mode: 'session', url: body.url, chargesRealMoney: true };
    } catch (err) {
      return { ok: false, status: 502, error: err instanceof Error ? err.message : 'stripe error' };
    }
  }

  const link = publicPaymentLink();
  if (link) {
    return {
      ok: true,
      status: 200,
      mode: 'link',
      url: buildPaymentLinkUrl(link, ref),
      chargesRealMoney: true,
    };
  }

  if (billingDemoMode()) {
    const expires = now + plusDurationMs();
    upsertPlus(db, userId, now, expires);
    return {
      ok: true,
      status: 200,
      mode: 'demo',
      plan: 'plus',
      expiresAt: expires,
      chargesRealMoney: false,
    };
  }

  return { ok: false, status: 503, mode: 'none', error: 'billing not configured', chargesRealMoney: false };
}

export function billingRulesPayload(now: number) {
  return {
    charging: CHARGING_RULES,
    payment: {
      stripeConfigured: stripeConfigured(),
      paymentLinkConfigured: !!publicPaymentLink(),
      demoMode: billingDemoMode(),
      plusDurationDays: CHARGING_RULES.plans.plus.durationDays,
      plusDisplayPriceCents: CHARGING_RULES.plans.plus.displayPriceCents,
      now,
    },
  };
}

export function readEntitlement(db: DatabaseSync, userId: string, now: number): Entitlement {
  const row = db.prepare(
    'SELECT user_id, plan, expires_at, updated_at FROM entitlements WHERE user_id = ?',
  ).get(userId) as { user_id: string; plan: string; expires_at: number | null; updated_at: number } | undefined;
  if (!row) return { userId, plan: 'free', expiresAt: null, updatedAt: now };
  if (row.plan === 'plus' && row.expires_at != null && row.expires_at < now) {
    return { userId, plan: 'free', expiresAt: row.expires_at, updatedAt: row.updated_at };
  }
  return {
    userId: row.user_id,
    plan: row.plan === 'plus' ? 'plus' : 'free',
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  };
}

export function upsertPlus(
  db: DatabaseSync,
  userId: string,
  now: number,
  expiresAt: number | null,
  stripeCustomer?: string,
): Entitlement {
  db.prepare(`
    INSERT INTO entitlements (user_id, plan, expires_at, stripe_customer, updated_at)
    VALUES (?, 'plus', ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      plan = 'plus',
      expires_at = excluded.expires_at,
      stripe_customer = COALESCE(excluded.stripe_customer, entitlements.stripe_customer),
      updated_at = excluded.updated_at
  `).run(userId, expiresAt, stripeCustomer ?? null, now);
  return readEntitlement(db, userId, now);
}

/** Minimal Stripe signature check (no SDK). */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim() ?? '', v?.trim() ?? ''];
    }),
  );
  const ts = parts.t;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const age = Math.abs(now - Number(ts) * 1000);
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function handleStripeWebhook(
  db: DatabaseSync,
  rawBody: string,
  signature: string | null,
  now: number,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';
  if (!secret || !process.env.STRIPE_SECRET_KEY?.trim()) {
    return { ok: false, status: 503, error: 'billing not configured' };
  }
  if (!verifyStripeSignature(rawBody, signature, secret, now)) {
    return { ok: false, status: 400, error: 'invalid signature' };
  }
  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return { ok: false, status: 400, error: 'invalid json' };
  }
  const obj = event.data?.object ?? {};
  const userId = typeof obj.client_reference_id === 'string'
    ? obj.client_reference_id
    : typeof obj.metadata === 'object' && obj.metadata && typeof (obj.metadata as { userId?: unknown }).userId === 'string'
      ? (obj.metadata as { userId: string }).userId
      : null;
  if (event.type === 'checkout.session.completed' && userId) {
    const customer = typeof obj.customer === 'string' ? obj.customer : undefined;
    // Default Plus window from charging-rules when no subscription period is present.
    const expires = now + plusDurationMs();
    upsertPlus(db, userId, now, expires, customer);
    const email = typeof obj.customer_details === 'object' && obj.customer_details
      && typeof (obj.customer_details as { email?: unknown }).email === 'string'
      ? (obj.customer_details as { email: string }).email
      : typeof obj.customer_email === 'string'
        ? obj.customer_email
        : '';
    if (email) {
      const mail = autoReply('paymentReceipt');
      await sendMail({ to: email, subject: mail.subject, text: mail.body });
    }
  }
  return { ok: true, status: 200 };
}
