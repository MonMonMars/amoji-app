import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyDemoPlusUnlock,
  billingSnapshot,
  checkoutPaymentUrl,
  clearPlusPlanLocal,
  handlePaymentReturn,
  paymentsConfigured,
  planStatus,
  setPlusPlanLocal,
} from '../lib/billing';
import {
  PAYMENT_CLIENT_ID_KEY,
  billingClientId,
  buildStripePaymentLinkUrl,
  paymentDemoMode,
  paymentRequiredForChat,
  paymentReturnMessage,
  readPaymentReturn,
  upgradeOffered,
} from '../lib/payment-rules';

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn((k: string) => { store.delete(k); }),
    clear: vi.fn(() => { store.clear(); }),
    store,
  };
  vi.stubGlobal('localStorage', ls);
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    localStorage: ls,
    location: {
      href: 'https://example.test/amoji-app/chat?amoji_pay=success',
      search: '?amoji_pay=success',
      pathname: '/amoji-app/chat',
      hash: '',
    },
    history: { replaceState: vi.fn() },
  });
  return ls;
}

describe('payment rules', () => {
  const prevDemo = process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO;
  const prevLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  beforeEach(() => {
    mockLocalStorage();
    delete process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO;
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    clearPlusPlanLocal();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevDemo === undefined) delete process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO;
    else process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO = prevDemo;
    if (prevLink === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    else process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = prevLink;
  });

  it('requires payment only when free chat is blocked', () => {
    expect(paymentRequiredForChat({ plan: 'plus', chatAllowed: true })).toBe(false);
    expect(paymentRequiredForChat({ plan: 'free', chatAllowed: true })).toBe(false);
    expect(paymentRequiredForChat({ plan: 'free', chatAllowed: false })).toBe(true);
  });

  it('parses success / cancel / demo return kinds', () => {
    expect(readPaymentReturn('?amoji_pay=success')).toBe('success');
    expect(readPaymentReturn('amoji_pay=cancel')).toBe('cancel');
    expect(readPaymentReturn('?amoji_pay=demo')).toBe('demo');
    expect(readPaymentReturn('')).toBeNull();
    expect(paymentReturnMessage('cancel')).toMatch(/No charge/i);
  });

  it('appends client_reference_id to Payment Links', () => {
    const url = buildStripePaymentLinkUrl('https://buy.stripe.com/test_abc', 'user-42');
    expect(url).toContain('client_reference_id=user-42');
    expect(billingClientId().length).toBeGreaterThan(7);
    expect(localStorage.getItem(PAYMENT_CLIENT_ID_KEY)).toBeTruthy();
  });

  it('keeps upgrade off without link or demo', () => {
    expect(paymentsConfigured()).toBe(false);
    expect(paymentDemoMode()).toBe(false);
    expect(upgradeOffered(false)).toBe(false);
  });

  it('offers labeled demo unlock without a Stripe link', () => {
    process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO = '1';
    expect(paymentDemoMode()).toBe(true);
    expect(upgradeOffered(false)).toBe(true);
    applyDemoPlusUnlock();
    const status = planStatus();
    expect(status.plan).toBe('plus');
    expect(status.source).toBe('demo');
    expect(status.chatAllowed).toBe(true);
  });

  it('builds checkout URL from env payment link', () => {
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_live';
    const url = checkoutPaymentUrl('ref-1');
    expect(url).toContain('buy.stripe.com/test_live');
    expect(url).toContain('client_reference_id=ref-1');
  });

  it('handlePaymentReturn applies demo and strips the query', async () => {
    process.env.NEXT_PUBLIC_AMOJI_PAYMENT_DEMO = '1';
    const result = await handlePaymentReturn('?amoji_pay=demo');
    expect(result?.kind).toBe('demo');
    expect(planStatus().plan).toBe('plus');
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('exposes billing snapshot for systems UI', () => {
    setPlusPlanLocal();
    const snap = billingSnapshot();
    expect(snap.charging.freeDailyChatTurns).toBe(40);
    expect(snap.payment.version).toBe(1);
    clearPlusPlanLocal();
  });
});
