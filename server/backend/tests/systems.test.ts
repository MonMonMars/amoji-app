import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { openDb } from '../src/db.js';
import { verifyStripeSignature, upsertPlus, readEntitlement } from '../src/billing.js';
import { autoReply } from '../src/auto-reply.js';
import { mailConfigured } from '../src/email.js';
import { corsHeaders, rateLimit, _resetRateLimitsForTests } from '../src/security.js';

describe('backend systems helpers', () => {
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
});
