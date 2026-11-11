/**
 * Client-visible security posture. Not a substitute for hosting headers —
 * those live on the Node API (`server/backend/src/security.ts`).
 */

export interface SecurityFact {
  id: string;
  title: string;
  detail: string;
}

export const SECURITY_FACTS: SecurityFact[] = [
  {
    id: 'no-account-pages',
    title: 'GitHub Pages builds have no account server',
    detail: 'Profile, memory, and prefs stay in this browser unless you point the build at a production API.',
  },
  {
    id: 'anonymous-api',
    title: 'Production API uses anonymous bearer sessions',
    detail: 'When NEXT_PUBLIC_AMOJI_API is set, the Node host issues a random hex token stored only as amoji.backend.session — not email/password.',
  },
  {
    id: 'crisis-local',
    title: 'Crisis checks stay on-device',
    detail: 'Self-harm phrases are matched locally against a fixed list before any model call. That check is never uploaded.',
  },
  {
    id: 'byok-local',
    title: 'Bring-your-own keys stay in the browser',
    detail: 'Advanced brain / OpenAI TTS keys are written to localStorage and sent only to the provider you chose.',
  },
  {
    id: 'cors-rate',
    title: 'API CORS and rate limits',
    detail: 'Set AMOJI_CORS_ORIGIN on the Node host to lock origins. Per-IP rate limits (see lib/security-rules.ts) apply to auth, chat, TTS, reports, support, and billing webhooks. Pages builds have no API surface to rate-limit.',
  },
  {
    id: 'storage-wipe',
    title: 'Device wipe and optional API wipe',
    detail: 'Settings can export redacted product JSON and wipe local product keys (legal accept kept). DELETE /api/storage/me clears anonymous server rows when a bearer session exists.',
  },
  {
    id: 'no-tracking',
    title: 'No analytics or ad cookies',
    detail: 'The product does not ship analytics SDKs or advertising cookies. See the Cookies policy.',
  },
];

export function securityFacts(): SecurityFact[] {
  return SECURITY_FACTS;
}
