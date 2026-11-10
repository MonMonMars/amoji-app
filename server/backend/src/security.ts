/** CORS lock, security headers, and a tiny in-memory per-IP rate limiter. */

export function corsHeaders(req?: Request): Record<string, string> {
  const configured = (process.env.AMOJI_CORS_ORIGIN ?? '*').trim() || '*';
  const requestOrigin = req?.headers.get('origin')?.trim() ?? '';
  let allow = configured;
  if (configured !== '*') {
    const allowed = configured.split(',').map((s) => s.trim()).filter(Boolean);
    if (requestOrigin && allowed.includes(requestOrigin)) allow = requestOrigin;
    else allow = allowed[0] ?? 'null';
  }
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, stripe-signature',
    'access-control-max-age': '600',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
    'permissions-policy': 'camera=(), geolocation=(self), microphone=(self)',
  };
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Test helper. */
export function _resetRateLimitsForTests(): void {
  buckets.clear();
}

export function clientKey(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'local';
}
