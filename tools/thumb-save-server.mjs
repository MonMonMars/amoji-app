// r114 dev tool: receives baked thumbnail JPEGs from the /thumb-bake page
// (running in the local dev server) and writes them into
// apps/web/public/cast-thumbs/<id>.jpg. Dev only — the bake page only posts
// from localhost, and this server is started/stopped by hand around a bake.
// r123: also accepts ?kind=cutout (alpha PNG) → public/cast-cutout/<id>.png.
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps', 'web', 'public', 'cast-thumbs');
const OUT_CUTOUT = join(ROOT, 'apps', 'web', 'public', 'cast-cutout');
const PORT = 3999;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || !req.url?.startsWith('/save')) {
    res.writeHead(404); res.end('no'); return;
  }
  const params = new URL(req.url, 'http://x').searchParams;
  const id = params.get('id')?.replace(/[^\w-]/g, '');
  const kind = params.get('kind') === 'cutout' ? 'cutout' : 'thumb';
  if (!id) { res.writeHead(400); res.end('id?'); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try {
      const { dataUrl } = JSON.parse(body);
      const m = /^data:image\/(\w+);base64,(.+)$/.exec(String(dataUrl));
      if (!m) { res.writeHead(400); res.end('dataUrl?'); return; }
      const ext = kind === 'cutout' ? 'png' : 'jpg';
      const dir = kind === 'cutout' ? OUT_CUTOUT : OUT;
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${id}.${ext}`), Buffer.from(m[2], 'base64'));
      console.log(`saved ${kind} ${id}.${ext} (${Math.round((m[2].length * 0.75) / 1024)}KB)`);
      res.writeHead(200); res.end('ok');
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
});
server.listen(PORT, () => console.log(`thumb-save-server on :${PORT} → ${OUT} (+cast-cutout)`));
