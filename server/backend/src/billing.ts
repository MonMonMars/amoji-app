import type { DatabaseSync } from 'node:sqlite';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { autoReply } from './auto-reply.js';
import { sendMail } from './email.js';

export interface Entitlement {
  userId: string;
  plan: 'free' | 'plus';
  expiresAt: number | null;
  updatedAt: number;
}

export function stripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
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
    // Default Plus window: 30 days from webhook time when no subscription period is present.
    const expires = now + 30 * 24 * 60 * 60 * 1000;
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
