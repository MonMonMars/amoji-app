'use client';
/**
 * Handles Stripe / demo return query (?amoji_pay=success|cancel|demo).
 * Strips the param and syncs entitlement without blocking the shell.
 */
import { useEffect, useState } from 'react';
import { handlePaymentReturn, type PaymentReturnResult } from '../lib/billing';

export default function PaymentReturnHandler() {
  const [notice, setNotice] = useState<PaymentReturnResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await handlePaymentReturn();
      if (!cancelled && result) setNotice(result);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 8_000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex justify-center px-3"
    >
      <p className="max-w-md rounded-xl border border-white/15 bg-neutral-950/90 px-3 py-2 text-center text-xs text-white/85 shadow-lg backdrop-blur">
        {notice.message}
      </p>
    </div>
  );
}
