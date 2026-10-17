import type { DatabaseSync } from 'node:sqlite';
import { createSession, deleteSession, readSession } from './auth.js';
import { liveComplete } from './llm.js';
import { offlineComplete, parseChatBody, runChat, type ChatComplete } from './chat.js';
import { readState, writeState, type StatePatch } from './state.js';
import { buildEdgeSsml, parseTtsBody, resolveEdgeVoice, synthesizeEdge } from './tts.js';

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'cache-control': 'no-store',
};

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
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
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

export function createBackend(opts: BackendOptions): Backend {
  const now = opts.now ?? (() => Date.now());
  const llm = opts.llm ?? (process.env.AMOJI_LLM_PROVIDER === 'offline' ? 'offline' : 'live');
  const complete: ChatComplete = opts.complete ?? (llm === 'offline'
    ? async (input) => offlineComplete(input)
    : liveComplete());
  const synthesize = opts.synthesize ?? synthesizeEdge;

  async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        return json({ ok: true, tts: 'edge', db: 'sqlite' });
      }
      if (url.pathname === '/api/auth/session' && req.method === 'POST') {
        const body = await readJson(req) as { token?: unknown };
        if (typeof body.token === 'string') {
          const existing = readSession(opts.db, body.token.toLowerCase(), now());
          if (!existing) return json({ error: 'invalid session' }, 401);
          return json(existing);
        }
        return json(createSession(opts.db, now()));
      }
      if (url.pathname === '/api/auth/session' && req.method === 'GET') {
        const token = bearer(req);
        const session = token ? readSession(opts.db, token, now()) : undefined;
        if (!session) return json({ error: 'unauthorized' }, 401);
        return json(session);
      }
      if (url.pathname === '/api/auth/session' && req.method === 'DELETE') {
        const token = bearer(req);
        if (token) deleteSession(opts.db, token);
        return new Response(null, { status: 204, headers: CORS });
      }

      const token = bearer(req);
      const session = token ? readSession(opts.db, token, now()) : undefined;
      if (!session) return json({ error: 'unauthorized' }, 401);

      if (url.pathname === '/api/state' && req.method === 'GET') {
        return json(readState(opts.db, session.userId));
      }
      if (url.pathname === '/api/state' && req.method === 'PUT') {
        const patch = await readJson(req) as StatePatch;
        const saved = writeState(opts.db, session.userId, patch, now());
        if ('error' in saved) return json(saved, 400);
        return json(saved);
      }
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        const parsed = parseChatBody(await readJson(req));
        if ('error' in parsed) return json(parsed, 400);
        const result = await runChat(opts.db, session.userId, parsed, now(), complete);
        return json(result);
      }
      if (url.pathname === '/api/tts' && req.method === 'POST') {
        const parsed = parseTtsBody(await readJson(req));
        if ('error' in parsed) return json(parsed, 400);
        const voice = resolveEdgeVoice(parsed);
        const audio = await synthesize(buildEdgeSsml(parsed.text, voice));
        return new Response(Buffer.from(audio), {
          status: 200,
          headers: { ...CORS, 'content-type': 'audio/mpeg', 'x-amoji-voice': voice.name },
        });
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      const status = typeof err === 'object' && err && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 400;
      const message = err instanceof Error ? err.message : 'bad request';
      return json({ error: status === 413 ? 'too large' : message }, status);
    }
  }

  return { handle, db: opts.db };
}
