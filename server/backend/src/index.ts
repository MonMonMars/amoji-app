// Production API for a Node host. GitHub Pages does not run this process.
// The static demo keeps device-local chat, Edge sockets, and wardrobe.
//
//   pnpm --filter @amoji/server start
//   AMOJI_PORT=8787 AMOJI_DB=data/amoji.sqlite
//
// POST /api/auth/session     anonymous session (Bearer token)
// GET  /api/auth/session     resume
// DELETE /api/auth/session   end
// GET|PUT /api/state         character, scene, language, wardrobe
// POST /api/chat             LLM hook (keyed provider, else Pollinations, else offline)
// POST /api/tts              Edge read-aloud mp3 (default voice)
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openDb } from './db.js';
import { createBackend } from './http.js';

const port = Number(process.env.AMOJI_PORT ?? 8787);
const dbPath = process.env.AMOJI_DB ?? 'data/amoji.sqlite';
if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
const backend = createBackend({ db: openDb(dbPath) });

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `127.0.0.1:${port}`;
    const url = `http://${host}${req.url ?? '/'}`;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const method = req.method ?? 'GET';
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(', '));
    }
    const init: RequestInit = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') init.body = body;
    const request = new Request(url, init);
    const response = await backend.handle(request);
    const buf = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(buf);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'error' }));
  }
});

server.listen(port, () => {
  console.log(`amoji server http://127.0.0.1:${port}`);
});
