import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { openDb } from '../src/db.js';
import {
  verifyStripeSignature,
  upsertPlus,
  readEntitlement,
  startCheckout,
  buildPaymentLinkUrl,
  billingRulesPayload,
} from '../src/billing.js';
import { CHARGING_RULES, freeDailyChatTurnLimit } from '../src/charging-rules.js';
import { autoReply } from '../src/auto-reply.js';
import { mailConfigured } from '../src/email.js';
import { corsHeaders, rateLimit, _resetRateLimitsForTests } from '../src/security.js';
import { RATE_LIMIT_RULES, rateLimitRule } from '../src/security-rules.js';
import { wipeUserProductData } from '../src/storage-wipe.js';

describe('backend systems helpers', () => {
  it('publishes named rate-limit budgets', () => {
    expect(rateLimitRule('global').limit).toBe(240);
    expect(RATE_LIMIT_RULES.map((r) => r.id)).toEqual(
      expect.arrayContaining(['auth', 'chat', 'report', 'support', 'stripe']),
    );
  });

  it('wipes user-scoped sqlite tables', () => {
    const db = openDb(':memory:');
    const now = 1_700_000_000_000;
    db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run('u1', now);
    db.prepare(
      'INSERT INTO character_state (user_id, character_id, background_id, lang, kid_mode, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('u1', 'a01', 'bed', 'en', 0, now);
    db.prepare(
      'INSERT INTO chat_turns (user_id, role, content, created_at) VALUES (?, ?, ?, ?)',
    ).run('u1', 'user', 'hi', now);
    const removed = wipeUserProductData(db, 'u1');
    expect(removed).toEqual(expect.arrayContaining(['character_state', 'chat_turns']));
    db.close();
  });

  it('locks CORS when AMOJI_CORS_ORIGIN is set', () => {
    const prev = process.env.AMOJI_CORS_ORIGIN;
    process.env.AMOJI_CORS_ORIGIN = 'https://example.com,https://other.test';
    const headers = corsHeaders(new Request('http://amoji.local/api/health', {
      headers: { origin: 'https://other.test' },
    }));
    expect(headers['access-control-allow-origin']).toBe('https://other.test');
    expect(headers['x-content-type-options']).toBe('nosniff');
    if (prev === undefined) delete process.env.AMOJI_CORS_ORIGIN;
    else process.env.AMOJI_CORS_ORIGIN = prev;
  });

  it('rate-limits after the window fills', () => {
    _resetRateLimitsForTests();
    expect(rateLimit('t', 2, 60_000, 1_000)).toBe(true);
    expect(rateLimit('t', 2, 60_000, 1_001)).toBe(true);
    expect(rateLimit('t', 2, 60_000, 1_002)).toBe(false);
    expect(rateLimit('t', 2, 60_000, 70_000)).toBe(true);
  });

  it('verifies a stripe-style signature', () => {
    const secret = 'whsec_test';
    const body = '{"type":"checkout.session.completed"}';
    const ts = Math.floor(Date.now() / 1000);
    const v1 = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
    expect(verifyStripeSignature(body, `t=${ts},v1=${v1}`, secret)).toBe(true);
    expect(verifyStripeSignature(body, `t=${ts},v1=deadbeef`, secret)).toBe(false);
  });

  it('stores plus entitlements in sqlite', () => {
    const db = openDb(':memory:');
    const now = 1_700_000_000_000;
    upsertPlus(db, 'user-1', now, now + 86_400_000, 'cus_x');
    expect(readEntitlement(db, 'user-1', now).plan).toBe('plus');
    expect(readEntitlement(db, 'user-1', now + 90_000_000).plan).toBe('free');
    db.close();
  });

  it('ships auto-reply templates and leaves mail off by default', () => {
    expect(autoReply('reportAck').subject).toMatch(/report/i);
    expect(mailConfigured()).toBe(false);
  });

  it('publishes charging rules aligned with the free daily turn budget', () => {
    expect(freeDailyChatTurnLimit()).toBe(40);
    expect(CHARGING_RULES.gatedFeatures).toContain('chat_llm_turn');
    expect(billingRulesPayload(1_700_000_000_000).charging.version).toBe(1);
  });

  it('appends client_reference_id on payment links', () => {
    expect(buildPaymentLinkUrl('https://buy.stripe.com/x', 'u1')).toContain('client_reference_id=u1');
  });

  it('demo checkout grants Plus without Stripe secrets', async () => {
    const prev = process.env.AMOJI_BILLING_DEMO;
    process.env.AMOJI_BILLING_DEMO = '1';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PAYMENT_LINK;
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    const db = openDb(':memory:');
    const now = 1_700_000_000_000;
    const result = await startCheckout(db, 'user-demo', now);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('demo');
    expect(result.chargesRealMoney).toBe(false);
    expect(readEntitlement(db, 'user-demo', now).plan).toBe('plus');
    db.close();
    if (prev === undefined) delete process.env.AMOJI_BILLING_DEMO;
    else process.env.AMOJI_BILLING_DEMO = prev;
  });
});
