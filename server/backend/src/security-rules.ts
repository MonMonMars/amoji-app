/**
 * Server twin of `apps/web/lib/security-rules.ts` rate-limit budgets.
 * Keep numeric values identical — web tests assert against the client copy;
 * API handlers import this module.
 */

export const SECURITY_RULES_VERSION = 1;

export interface RateLimitRule {
  id: string;
  bucket: string;
  limit: number;
  windowMs: number;
  notes: string;
}

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  { id: 'global', bucket: 'all', limit: 240, windowMs: 60_000, notes: 'All API requests per IP' },
  { id: 'auth', bucket: 'auth', limit: 30, windowMs: 60_000, notes: 'Session create / refresh' },
  { id: 'chat', bucket: 'chat', limit: 60, windowMs: 60_000, notes: 'Chat completions' },
  { id: 'tts', bucket: 'tts', limit: 60, windowMs: 60_000, notes: 'TTS synthesize' },
  { id: 'report', bucket: 'report', limit: 10, windowMs: 60_000, notes: 'Content reports' },
  { id: 'support', bucket: 'support', limit: 10, windowMs: 60_000, notes: 'Support contact form' },
  { id: 'stripe', bucket: 'stripe', limit: 60, windowMs: 60_000, notes: 'Stripe webhook intake' },
];

export function rateLimitRule(id: string): RateLimitRule {
  const found = RATE_LIMIT_RULES.find((r) => r.id === id);
  if (!found) throw new Error(`unknown rate limit id: ${id}`);
  return found;
}
