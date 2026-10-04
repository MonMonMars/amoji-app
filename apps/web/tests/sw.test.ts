import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// r2026-10-04.73 — offline support. The service worker is plain public/sw.js
// (zero dependencies, survives Next.js static export), so these tests read
// the shipped file and guard the behaviours that keep the installed app
// opening without a connection.
const here = dirname(fileURLToPath(import.meta.url));
const sw = readFileSync(join(here, '../public/sw.js'), 'utf8');

describe('offline service worker', () => {
  it('versions the cache with the app revision', () => {
    expect(sw).toMatch(/amoji-r2026-10-04\.\d+/);
  });

  it('precaches the app shell pages', () => {
    for (const p of ['/', './chat', './select', './change', './login']) {
      expect(sw).toContain(`'${p}'`);
    }
  });

  it('serves navigations network-first with an offline shell fallback', () => {
    expect(sw).toContain("mode === 'navigate'");
    expect(sw).toContain('self.registration.scope');
  });

  it('never touches cross-origin or non-GET requests', () => {
    expect(sw).toContain("request.method !== 'GET'");
    expect(sw).toContain('url.origin !== self.location.origin');
  });

  it('purges stale amoji caches on activate', () => {
    expect(sw).toContain('caches.delete');
  });
});
