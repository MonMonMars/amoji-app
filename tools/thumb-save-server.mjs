// r114 dev tool: receives baked thumbnail JPEGs from the /thumb-bake page
// (running in the local dev server) and writes them into
// apps/web/public/cast-thumbs/<id>.jpg. Dev only — the bake page only posts
// from localhost, and this server is started/stopped by hand around a bake.
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps', 'web', 'public', 'cast-thumbs');
const PORT = 3999;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || !req.url?.startsWith('/save')) {
    res.writeHead(404); res.end('no'); return;
  }
  const id = new URL(req.url, 'http://x').searchParams.get('id')?.replace(/[^\w-]/g, '');
  if (!id) { res.writeHead(400); res.end('id?'); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try {
      const { dataUrl } = JSON.parse(body);
      const b64 = String(dataUrl).replace(/^data:image\/\w+;base64,/, '');
      mkdirSync(OUT, { recursive: true });
      writeFileSync(join(OUT, `${id}.jpg`), Buffer.from(b64, 'base64'));
      console.log(`saved ${id}.jpg (${Math.round((b64.length * 0.75) / 1024)}KB)`);
      res.writeHead(200); res.end('ok');
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
});
server.listen(PORT, () => console.log(`thumb-save-server on :${PORT} → ${OUT}`));
