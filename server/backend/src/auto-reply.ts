/** Server-side English templates (web ships multi-lang in apps/web/lib/auto-reply.ts). */

export type AutoReplyKind = 'reportAck' | 'supportAck' | 'paymentReceipt';

const TEMPLATES: Record<AutoReplyKind, { subject: string; body: string }> = {
  reportAck: {
    subject: 'We received your Amoji report',
    body: 'Thanks for reporting. Your note is saved for review. This is an automatic acknowledgment — a person may follow up if more detail is needed. If you are in crisis, use the helplines on the safety page instead of waiting for email.',
  },
  supportAck: {
    subject: 'Amoji support — we got your message',
    body: 'This is an automatic reply confirming we received your message. For safety emergencies, contact local emergency services or the helplines listed in the app.',
  },
  paymentReceipt: {
    subject: 'Amoji Plus — payment recorded',
    body: 'Thanks. Your Plus entitlement is active for this account/session when the payment webhook confirms. Keep your receipt from the payment provider for your records.',
  },
};

export function autoReply(kind: AutoReplyKind): { subject: string; body: string } {
  return TEMPLATES[kind];
}
