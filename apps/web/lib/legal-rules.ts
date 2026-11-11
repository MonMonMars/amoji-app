/**
 * Legal rules — which policy docs ship, what acceptance covers, and when to
 * bump LEGAL_ACCEPT_VERSION. Complements `legal-accept.ts` + `legal-copy.ts`.
 */

import {
  LEGAL_ACCEPT_VERSION,
  getLegalAcceptRecord,
  hasAcceptedCurrentLegal,
  type LegalAcceptRecord,
} from './legal-accept';

export const LEGAL_RULES_VERSION = 1;

export interface LegalDocRoute {
  id: 'privacy' | 'terms' | 'cookies' | 'safety' | 'credits';
  path: string;
  /** Included in the first-run Accept gate summary. */
  gated: boolean;
  summary: string;
}

export const LEGAL_DOC_ROUTES: LegalDocRoute[] = [
  {
    id: 'privacy',
    path: '/privacy',
    gated: true,
    summary: 'What stays on-device, what leaves, named recipients, optional API/payments/email.',
  },
  {
    id: 'terms',
    path: '/terms',
    gated: true,
    summary: 'Companion is not a professional service; free quota; optional Plus via Stripe.',
  },
  {
    id: 'cookies',
    path: '/cookies',
    gated: false,
    summary: 'No ad/analytics cookies; localStorage / sessionStorage inventory.',
  },
  {
    id: 'safety',
    path: '/safety',
    gated: false,
    summary: 'Crisis helplines; on-device crisis guard before any model call.',
  },
  {
    id: 'credits',
    path: '/credits',
    gated: false,
    summary: 'Model / asset licence credits required by redistributed content.',
  },
];

/**
 * Bump LEGAL_ACCEPT_VERSION when any gated fact changes for returning users.
 * v3 — cookies + optional API/payment/email.
 * v4 — Settings product-data export/wipe contracts + fuller storage inventory
 *      (BYOK keys, mute, place) named in cookies/privacy.
 */
export const LEGAL_ACCEPT_BUMP_NOTES: Record<number, string> = {
  2: 'Plain named-recipient privacy/terms; /safety page.',
  3: 'Cookies policy; free-host inventory; optional API payment + transactional email.',
  4: 'Product data export/wipe in Settings; fuller client-storage inventory in cookies/privacy.',
};

export interface LegalClientStatus {
  rulesVersion: number;
  currentAcceptVersion: number;
  accepted: boolean;
  record: LegalAcceptRecord | null;
  docs: LegalDocRoute[];
  posture: string;
}

export function legalClientStatus(): LegalClientStatus {
  const record = getLegalAcceptRecord();
  const accepted = hasAcceptedCurrentLegal();
  return {
    rulesVersion: LEGAL_RULES_VERSION,
    currentAcceptVersion: LEGAL_ACCEPT_VERSION,
    accepted,
    record,
    docs: LEGAL_DOC_ROUTES,
    posture: accepted
      ? `Accepted policy v${LEGAL_ACCEPT_VERSION}${record?.acceptedAt ? ` on ${record.acceptedAt.slice(0, 10)}` : ''}.`
      : `Not accepted for current policy v${LEGAL_ACCEPT_VERSION} — first-run gate still applies.`,
  };
}
