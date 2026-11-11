/**
 * Security rules — CORS, rate limits, anonymous vs bearer routes, and an
 * honest client status (Pages vs production API). Complements
 * `security-policy.ts` (user-facing facts) and `server/backend/src/security.ts`.
 *
 * Live enforcement of CORS / rate limits happens only on the Node API.
 * GitHub Pages builds have no account server and never pretend otherwise.
 */

import { productionApiConfigured } from './systems-catalog';

export const SECURITY_RULES_VERSION = 1;

export interface RateLimitRule {
  id: string;
  /** Bucket key prefix used by the Node API (`${id}:${ip}`). */
  bucket: string;
  limit: number;
  windowMs: number;
  notes: string;
}

/** Mirrors `server/backend/src/security-rules.ts` — keep values in sync. */
export const RATE_LIMIT_RULES: RateLimitRule[] = [
  { id: 'global', bucket: 'all', limit: 240, windowMs: 60_000, notes: 'All API requests per IP' },
  { id: 'auth', bucket: 'auth', limit: 30, windowMs: 60_000, notes: 'Session create / refresh' },
  { id: 'chat', bucket: 'chat', limit: 60, windowMs: 60_000, notes: 'Chat completions' },
  { id: 'tts', bucket: 'tts', limit: 60, windowMs: 60_000, notes: 'TTS synthesize' },
  { id: 'report', bucket: 'report', limit: 10, windowMs: 60_000, notes: 'Content reports' },
  { id: 'support', bucket: 'support', limit: 10, windowMs: 60_000, notes: 'Support contact form' },
  { id: 'stripe', bucket: 'stripe', limit: 60, windowMs: 60_000, notes: 'Stripe webhook intake' },
];

export type RouteAuthMode = 'anonymous' | 'bearer' | 'optional-bearer' | 'public';

export interface RouteAuthRule {
  method: string;
  path: string;
  auth: RouteAuthMode;
  notes: string;
}

export const ROUTE_AUTH_RULES: RouteAuthRule[] = [
  { method: 'GET', path: '/api/health', auth: 'public', notes: 'Liveness + feature flags (mail/billing configured)' },
  { method: 'GET', path: '/api/systems', auth: 'public', notes: 'Host inventory; no secrets' },
  { method: 'POST', path: '/api/auth/session', auth: 'anonymous', notes: 'Issues random hex bearer; no email/password' },
  { method: 'GET', path: '/api/auth/session', auth: 'bearer', notes: 'Read current session' },
  { method: 'DELETE', path: '/api/auth/session', auth: 'bearer', notes: 'End session token only' },
  { method: 'POST', path: '/api/reports', auth: 'optional-bearer', notes: 'Anonymous allowed; attaches user when present' },
  { method: 'POST', path: '/api/support', auth: 'optional-bearer', notes: 'Anonymous support intake; session user id attached when present' },
  { method: 'DELETE', path: '/api/storage/me', auth: 'bearer', notes: 'Wipe this session’s server-side product rows' },
  { method: 'POST', path: '/api/billing/webhook', auth: 'public', notes: 'Stripe signature required; not a user session' },
];

export interface SecurityEnvFact {
  name: string;
  where: 'node-api' | 'web-build';
  required: boolean;
  purpose: string;
}

/** Documented secrets / config — values never appear in the client status. */
export const SECURITY_ENV: SecurityEnvFact[] = [
  {
    name: 'AMOJI_CORS_ORIGIN',
    where: 'node-api',
    required: false,
    purpose: 'Comma-separated allowed origins. Unset or * allows any Origin (dev default).',
  },
  {
    name: 'NEXT_PUBLIC_AMOJI_API',
    where: 'web-build',
    required: false,
    purpose: 'Production API base URL. Unset = GitHub Pages / fully on-device.',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    where: 'node-api',
    required: false,
    purpose: 'Live Stripe API. Without it, checkout sessions stay off.',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    where: 'node-api',
    required: false,
    purpose: 'Verifies Stripe webhook signatures before writing entitlements.',
  },
  {
    name: 'RESEND_API_KEY',
    where: 'node-api',
    required: false,
    purpose: 'Transactional mail. Without it, report/support ack mail is skipped.',
  },
  {
    name: 'AMOJI_MAIL_FROM',
    where: 'node-api',
    required: false,
    purpose: 'From address for Resend. Required together with RESEND_API_KEY.',
  },
];

export interface SecurityClientStatus {
  version: number;
  productionApi: boolean;
  /** Honest label — never "connected" without an API URL. */
  posture: string;
  rateLimits: RateLimitRule[];
  envDocumented: string[];
}

export function securityClientStatus(): SecurityClientStatus {
  const productionApi = productionApiConfigured();
  return {
    version: SECURITY_RULES_VERSION,
    productionApi,
    posture: productionApi
      ? 'Production API URL is set for this build. CORS lock, rate limits, and security headers apply on that Node host — not on GitHub Pages itself.'
      : 'No production API URL (Pages / on-device). There is no account server, no CORS lock surface, and no rate-limited API from this build.',
    rateLimits: RATE_LIMIT_RULES,
    envDocumented: SECURITY_ENV.map((e) => e.name),
  };
}

export function rateLimitFor(id: string): RateLimitRule | undefined {
  return RATE_LIMIT_RULES.find((r) => r.id === id);
}
