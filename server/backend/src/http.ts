import type { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { createSession, deleteSession, readSession } from './auth.js';
import { liveComplete } from './llm.js';
import { offlineComplete, parseChatBody, runChat, type ChatComplete } from './chat.js';
import { readState, writeState, type StatePatch } from './state.js';
import { buildEdgeSsml, parseTtsBody, resolveEdgeVoice, synthesizeEdge } from './tts.js';
import { clientKey, corsHeaders, rateLimit } from './security.js';
import {
  billingRulesPayload,
  handleStripeWebhook,
  readEntitlement,
  startCheckout,
  stripeConfigured,
} from './billing.js';
import { autoReply } from './auto-reply.js';
import { mailConfigured, sendMail } from './email.js';

export interface Backend {
  handle(req: Request): Promise<Response>;
  db: DatabaseSync;
}

export interface BackendOptions {
  db: DatabaseSync;
  now?: () => number;
  complete?: ChatComplete;
  synthesize?: (ssml: string) => Promise<Uint8Array>;
  /** `offline` never calls a model. Default follows AMOJI_LLM_PROVIDER. */
  llm?: 'offline' | 'live';
  /**
   * Fills weather / news when the client did not send usable live facts.
   * The production process wires this to keyless Open-Meteo + Wikipedia.
   * Tests omit it so chat stays offline.
   */
  gatherWorld?: (
    message: string,
    language: string | undefined,
    priorUser: string | undefined,
    clientIp: string | undefined,
  ) => Promise<{ prompt: string; spoken: string }>;
}

function clientIpOf(req: Request): string | undefined {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  return real?.trim() || undefined;
}

function worldIsThin(world: string | undefined): boolean {
  const text = world?.trim() ?? '';
  if (!text) return true;
  if (/Weather:\s*-?\d+°C/i.test(text)) return false;
  if (/(?:Light|Recent) news[^:\n]*:\s*[“"]/i.test(text)) return false;
  if (/\bWeb:\s+\S/.test(text) && !/nothing useful/i.test(text)) return false;
  return true;
}

function json(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'content-type': 'application/json; charset=utf-8' },
  });
}

function bearer(req: Request): string | undefined {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(h.trim());
  return m?.[1]?.toLowerCase();
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 65_536) {
    const err = new Error('too large');
    (err as Error & { status: number }).status = 413;
    throw err;
  }
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

function logMail(db: DatabaseSync, kind: string, to: string, ok: boolean, detail: string, now: number): void {
  db.prepare(
    'INSERT INTO mail_log (kind, to_addr, ok, detail, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(kind, to, ok ? 1 : 0, detail.slice(0, 500), now);
}

export function createBackend(opts: BackendOptions): Backend {
  const now = opts.now ?? (() => Date.now());
  const llm = opts.llm ?? (process.env.AMOJI_LLM_PROVIDER === 'offline' ? 'offline' : 'live');
  const complete: ChatComplete = opts.complete ?? (llm === 'offline'
    ? async (input) => offlineComplete(input)
    : liveComplete());
  const synthesize = opts.synthesize ?? synthesizeEdge;

  async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const headers = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const ip = clientKey(req);
    if (!rateLimit(`all:${ip}`, 240, 60_000, now())) {
      return json({ error: 'rate limited' }, 429, req);
    }

    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        return json({
          ok: true,
          tts: 'edge',
          db: 'sqlite',
          mail: mailConfigured(),
          billing: stripeConfigured(),
        }, 200, req);
      }

      if (url.pathname === '/api/systems' && req.method === 'GET') {
        return json({
          freeServers: [
            { id: 'pages', role: 'Companion UI', host: 'GitHub Pages' },
            { id: 'tts-proxy', role: 'Edge TTS relay', host: 'Cloudflare Worker' },
            { id: 'backend', role: 'Session API', host: 'this Node process' },
          ],
          fileLocations: [
            { id: 'sqlite', location: process.env.AMOJI_DB ?? 'data/amoji.sqlite' },
          ],
          mail: mailConfigured(),
          billing: stripeConfigured(),
          cors: (process.env.AMOJI_CORS_ORIGIN ?? '*').trim() || '*',
        }, 200, req);
      }

      if (url.pathname === '/api/billing/webhook' && req.method === 'POST') {
        if (!rateLimit(`stripe:${ip}`, 60, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const raw = await req.text();
        const result = await handleStripeWebhook(
          opts.db,
          raw,
          req.headers.get('stripe-signature'),
          now(),
        );
        return json(result.ok ? { received: true } : { error: result.error }, result.status, req);
      }

      if (url.pathname === '/api/billing/rules' && req.method === 'GET') {
        return json(billingRulesPayload(now()), 200, req);
      }

      if (url.pathname === '/api/auth/session' && req.method === 'POST') {
        if (!rateLimit(`auth:${ip}`, 30, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const body = await readJson(req) as { token?: unknown };
        if (typeof body.token === 'string') {
          const existing = readSession(opts.db, body.token.toLowerCase(), now());
          if (!existing) return json({ error: 'invalid session' }, 401, req);
          return json(existing, 200, req);
        }
        return json(createSession(opts.db, now()), 200, req);
      }
      if (url.pathname === '/api/auth/session' && req.method === 'GET') {
        const token = bearer(req);
        const session = token ? readSession(opts.db, token, now()) : undefined;
        if (!session) return json({ error: 'unauthorized' }, 401, req);
        return json(session, 200, req);
      }
      if (url.pathname === '/api/auth/session' && req.method === 'DELETE') {
        const token = bearer(req);
        if (token) deleteSession(opts.db, token);
        return new Response(null, { status: 204, headers });
      }

      // Report intake can be anonymous (Pages may not have a session yet) but
      // still rate-limited. When a session exists we attach the user id.
      if (url.pathname === '/api/reports' && req.method === 'POST') {
        if (!rateLimit(`report:${ip}`, 10, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const body = await readJson(req) as {
          reason?: unknown;
          note?: unknown;
          reply?: unknown;
          contactEmail?: unknown;
        };
        const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 64) : '';
        const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
        const reply = typeof body.reply === 'string' ? body.reply.trim().slice(0, 400) : '';
        const contactEmail = typeof body.contactEmail === 'string' ? body.contactEmail.trim().slice(0, 200) : '';
        if (!reason || !reply) return json({ error: 'reason and reply required' }, 400, req);
        const token = bearer(req);
        const session = token ? readSession(opts.db, token, now()) : undefined;
        const id = randomBytes(16).toString('hex');
        opts.db.prepare(
          'INSERT INTO reports (id, user_id, reason, note, reply, contact_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(id, session?.userId ?? null, reason, note, reply, contactEmail || null, now());

        let mailed = false;
        if (contactEmail) {
          const tpl = autoReply('reportAck');
          const result = await sendMail({ to: contactEmail, subject: tpl.subject, text: tpl.body });
          logMail(opts.db, 'reportAck', contactEmail, result.ok, result.error ?? result.id ?? '', now());
          mailed = result.ok;
        }
        return json({ id, stored: true, emailed: mailed, mailConfigured: mailConfigured() }, 200, req);
      }

      // Support contact is anonymous (like reports) so Pages clients can open a
      // session-less POST when NEXT_PUBLIC_AMOJI_API points at this host.
      if (url.pathname === '/api/support' && req.method === 'POST') {
        if (!rateLimit(`support:${ip}`, 10, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const body = await readJson(req) as { email?: unknown; message?: unknown };
        const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
        const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
        if (!email || !email.includes('@') || !message) {
          return json({ error: 'email and message required' }, 400, req);
        }
        const supportToken = bearer(req);
        const supportSession = supportToken ? readSession(opts.db, supportToken, now()) : undefined;
        const id = randomBytes(16).toString('hex');
        opts.db.prepare(
          'INSERT INTO support_messages (id, user_id, email, message, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(id, supportSession?.userId ?? null, email, message, now());

        const tpl = autoReply('supportAck');
        const result = await sendMail({
          to: email,
          subject: tpl.subject,
          text: `${tpl.body}\n\n—\nYour message:\n${message}`,
        });
        logMail(opts.db, 'supportAck', email, result.ok, result.error ?? result.id ?? '', now());

        let opsNotified = false;
        const inbox = (process.env.AMOJI_SUPPORT_INBOX ?? '').trim();
        if (inbox && inbox.includes('@') && mailConfigured()) {
          const ops = await sendMail({
            to: inbox,
            subject: `Amoji support message (${id.slice(0, 8)})`,
            text: `From: ${email}\nId: ${id}\n\n${message}`,
          });
          logMail(opts.db, 'supportOps', inbox, ops.ok, ops.error ?? ops.id ?? '', now());
          opsNotified = ops.ok;
        }

        return json({
          id,
          ok: true,
          stored: true,
          emailed: result.ok,
          skipped: !!result.skipped,
          opsNotified,
          mailConfigured: mailConfigured(),
        }, 200, req);
      }

      const token = bearer(req);
      const session = token ? readSession(opts.db, token, now()) : undefined;
      if (!session) return json({ error: 'unauthorized' }, 401, req);

      if (url.pathname === '/api/billing/entitlement' && req.method === 'GET') {
        return json(readEntitlement(opts.db, session.userId, now()), 200, req);
      }

      if (url.pathname === '/api/billing/checkout' && req.method === 'POST') {
        if (!rateLimit(`checkout:${ip}`, 10, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const body = await readJson(req) as { returnOrigin?: unknown; clientId?: unknown };
        const checkoutOpts: { returnOrigin?: string; clientId?: string } = {};
        if (typeof body.returnOrigin === 'string') checkoutOpts.returnOrigin = body.returnOrigin;
        if (typeof body.clientId === 'string') checkoutOpts.clientId = body.clientId;
        const result = await startCheckout(opts.db, session.userId, now(), checkoutOpts);
        return json(
          result.ok
            ? {
                mode: result.mode,
                url: result.url,
                plan: result.plan,
                expiresAt: result.expiresAt,
                chargesRealMoney: result.chargesRealMoney,
              }
            : { error: result.error, mode: result.mode },
          result.status,
          req,
        );
      }

      if (url.pathname === '/api/state' && req.method === 'GET') {
        return json(readState(opts.db, session.userId), 200, req);
      }
      if (url.pathname === '/api/state' && req.method === 'PUT') {
        const patch = await readJson(req) as StatePatch;
        const saved = writeState(opts.db, session.userId, patch, now());
        if ('error' in saved) return json(saved, 400, req);
        return json(saved, 200, req);
      }
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        if (!rateLimit(`chat:${ip}`, 60, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const parsed = parseChatBody(await readJson(req));
        if ('error' in parsed) return json(parsed, 400, req);
        let chatReq = parsed;
        if (opts.gatherWorld && worldIsThin(chatReq.world)) {
          try {
            const prior = [...chatReq.history].reverse().find((m) => m.role === 'user')?.content;
            const live = await opts.gatherWorld(chatReq.message, chatReq.language, prior, clientIpOf(req));
            if (live.prompt && !worldIsThin(live.prompt)) {
              const spoken = (chatReq.worldSpoken ?? live.spoken).slice(0, 600);
              chatReq = { ...chatReq, world: live.prompt.slice(0, 1200), ...(spoken ? { worldSpoken: spoken } : {}) };
            } else if (!chatReq.worldSpoken && live.spoken) {
              chatReq = { ...chatReq, worldSpoken: live.spoken.slice(0, 600) };
            }
          } catch { /* chat still answers */ }
        }
        const result = await runChat(opts.db, session.userId, chatReq, now(), complete);
        return json(result, 200, req);
      }
      if (url.pathname === '/api/tts' && req.method === 'POST') {
        if (!rateLimit(`tts:${ip}`, 60, 60_000, now())) {
          return json({ error: 'rate limited' }, 429, req);
        }
        const parsed = parseTtsBody(await readJson(req));
        if ('error' in parsed) return json(parsed, 400, req);
        const voice = resolveEdgeVoice(parsed);
        const audio = await synthesize(buildEdgeSsml(parsed.text, voice));
        return new Response(Buffer.from(audio), {
          status: 200,
          headers: { ...headers, 'content-type': 'audio/mpeg', 'x-amoji-voice': voice.name },
        });
      }
      return json({ error: 'not found' }, 404, req);
    } catch (err) {
      const status = typeof err === 'object' && err && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 400;
      const message = err instanceof Error ? err.message : 'bad request';
      return json({ error: status === 413 ? 'too large' : message }, status, req);
    }
  }

  return { handle, db: opts.db };
}
