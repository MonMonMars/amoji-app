/**
 * Transactional email via Resend when configured.
 * Without RESEND_API_KEY + AMOJI_MAIL_FROM, sendMail records a skipped result
 * and returns ok:false — callers must not pretend mail left the building.
 */

export interface MailInput {
  to: string;
  subject: string;
  text: string;
}

export interface MailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export function mailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY?.trim() && process.env.AMOJI_MAIL_FROM?.trim());
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim() ?? '';
  const from = process.env.AMOJI_MAIL_FROM?.trim() ?? '';
  if (!key || !from) {
    return { ok: false, skipped: true, error: 'mail not configured' };
  }
  const to = input.to.trim();
  if (!to || !to.includes('@')) {
    return { ok: false, error: 'invalid recipient' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject.slice(0, 200),
        text: input.text.slice(0, 8_000),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `resend ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json() as { id?: string };
    if (typeof data.id === 'string' && data.id) return { ok: true, id: data.id };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}
