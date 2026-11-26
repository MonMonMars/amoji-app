#!/usr/bin/env node
/**
 * Local static server for the AMOJI export. No dependencies, no network.
 *
 *   npm run serve:local            # serve out/ on http://127.0.0.1:4173
 *   npm run serve:local -- 8080    # pick another port
 *
 * Why this exists instead of `npx serve`: the owner runs everything locally
 * from the D: drive and does not want a package download just to open the app.
 * `npx` would also hit the network, which is exactly what we are avoiding.
 *
 * The static export is root-relative (AMOJI_BASE_PATH is unset for local
 * builds), so serving out/ at "/" is correct. Do NOT set AMOJI_BASE_PATH when
 * building for this server or every /_next asset will 404.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT = resolve(here, '..', 'out');

const argPort = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const PORT = Number(argPort || process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.vrm': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'application/octet-stream',
};

/**
 * Resolve a URL path to a real file inside out/, trying the same fallbacks a
 * static host does: exact file, `<path>.html` (Next export writes about.html,
 * not about/index.html), then `<path>/index.html`.
 */
async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const safe = normalize(decoded).replace(/^([/\\])+/, '');
  const target = resolve(join(OUT, safe));
  // Refuse anything that escaped the export directory.
  if (target !== OUT && !target.startsWith(OUT + sep)) return null;

  const candidates = [target];
  if (!extname(target)) {
    candidates.push(`${target}.html`, join(target, 'index.html'));
  }

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const urlPath = req.url || '/';
  const file = await resolveFile(urlPath);

  if (!file) {
    const notFound = await resolveFile('/404.html');
    if (notFound) {
      res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
      createReadStream(notFound).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
    return;
  }

  const ext = extname(file).toLowerCase();
  const isServiceWorker = file.endsWith(`${sep}sw.js`);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // Never cache locally: the whole point is to see the change you just built,
    // and a cached sw.js would keep serving an older bundle.
    'Cache-Control': 'no-store',
    ...(isServiceWorker ? { 'Service-Worker-Allowed': '/' } : {}),
    ...(ext === '.wasm' ? { 'Cross-Origin-Embedder-Policy': 'require-corp' } : {}),
  };

  const info = await stat(file);
  headers['Content-Length'] = String(info.size);
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[amoji-local] serving ${OUT}`);
  console.log(`[amoji-local] http://${HOST}:${PORT}/  (Ctrl+C to stop)`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[amoji-local] port ${PORT} is busy — try: npm run serve:local -- 8080`);
    process.exit(1);
  }
  throw err;
});
