import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const SW_SOURCE = readFileSync(join(here, '../public/sw.js'), 'utf8');
const SCOPE = 'https://example.test/amoji-app/';

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}

/**
 * Minimal ordered Cache API stand-in. The real Cache keeps entries in
 * insertion order and cache.keys() returns them that way, which is what the
 * eviction logic depends on. Ordering is therefore the whole point of this
 * double — a Set/Map would silently make the bug invisible.
 */
function makeCache(name: string) {
  const entries = new Map<string, unknown>();
  return {
    name,
    entries,
    add(u: { href: string }) {
      entries.set(u.href, { ok: true });
      return Promise.resolve();
    },
    put(req: FakeRequest, res: unknown) {
      // Re-putting must not move an entry to the end (matches real Cache).
      if (!entries.has(req.url)) entries.set(req.url, res);
      return Promise.resolve();
    },
    match(req: FakeRequest) {
      return Promise.resolve(entries.get(req.url));
    },
    keys() {
      return Promise.resolve(
        Array.from(entries.keys()).map((url) => ({ url, method: 'GET', mode: 'no-cors' })),
      );
    },
    delete(req: FakeRequest) {
      return Promise.resolve(entries.delete(req.url));
    },
  };
}

/** Boot sw.js in a sandbox and return its handlers + the live cache. */
function bootSw() {
  const caches: Record<string, ReturnType<typeof makeCache>> = {};
  const handlers: Record<string, (e: unknown) => void> = {};

  const cacheStorage = {
    open(name: string) {
      caches[name] = caches[name] ?? makeCache(name);
      return Promise.resolve(caches[name]);
    },
    keys() {
      return Promise.resolve(Object.keys(caches));
    },
    delete(name: string) {
      delete caches[name];
      return Promise.resolve(true);
    },
    /** CacheStorage.match searches every cache, newest first (real semantics). */
    match(req: FakeRequest) {
      const names = Object.keys(caches).reverse();
      for (const n of names) {
        const hit = caches[n]!.entries.get(req.url);
        if (hit) return Promise.resolve(hit);
      }
      return Promise.resolve(undefined);
    },
  };

  const self = {
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
    addEventListener(type: string, fn: (e: unknown) => void) {
      handlers[type] = fn;
    },
  };

  const sandbox = {
    self,
    caches: cacheStorage,
    URL,
    Promise,
    console,
    fetch: () => Promise.resolve({ ok: true, type: 'basic', clone: () => ({ ok: true }) }),
    Response: function Response(this: unknown) {},
  };

  vm.createContext(sandbox);
  vm.runInContext(SW_SOURCE, sandbox);

  const cacheName = (/var CACHE = '([^']+)'/.exec(SW_SOURCE) ?? [])[1]!;
  return { handlers, caches, cacheName };
}

/** Run install so the shell is precached (these are the OLDEST entries). */
async function warmShell() {
  const ctx = bootSw();
  let installPromise: Promise<unknown> = Promise.resolve();
  ctx.handlers.install!({
    waitUntil: (p: Promise<unknown>) => {
      installPromise = p;
    },
  });
  await installPromise;
  return ctx;
}

/** Drive one asset request through the fetch handler (cache-fill + trim). */
async function fetchAsset(ctx: ReturnType<typeof bootSw>, url: string) {
  let done: Promise<unknown> = Promise.resolve();
  ctx.handlers.fetch!({
    request: { url, method: 'GET', mode: 'no-cors' },
    respondWith: (p: Promise<unknown>) => {
      done = p;
    },
  });
  await done;
  // cache.put().then(trim) is fire-and-forget; let the microtasks settle.
  await new Promise((r) => setTimeout(r, 0));
}

/** The real precache list, read from the worker so it cannot drift from the test. */
const SHELL_LIST: string[] = (() => {
  const m = /var SHELL = \[([\s\S]*?)\];/.exec(SW_SOURCE);
  if (!m) return [];
  return Array.from(m[1]!.matchAll(/'([^']+)'/g)).map((x) => x[1]!);
})();
const SHELL_PAGES = SHELL_LIST;

describe('service worker cache eviction', () => {
  it('does not evict the precached offline shell when many assets are cached', async () => {    const ctx = await warmShell();
    const cache = ctx.caches[ctx.cacheName]!;

    // The shell landed first, so with oldest-first trimming it is first out.
    expect(SHELL_PAGES.length).toBeGreaterThan(10);
    expect(cache.entries.size).toBe(SHELL_PAGES.length);

    // Realistic browsing: a few hundred assets (VRMs, portraits, js/css).
    for (let i = 0; i < 320; i += 1) {
      await fetchAsset(ctx, `${SCOPE}models/asset-${i}.vrm`);
    }

    const remaining = new Set(cache.entries.keys());
    const missing = SHELL_PAGES.map((p) => new URL(p, SCOPE).href).filter((u) => !remaining.has(u));

    // If the shell is gone, the offline promise is broken: the app opens to a
    // blank frame with no cached page to fall back to.
    expect(missing).toEqual([]);
  }, 30_000);

  it('still enforces the cap on opportunistic assets', async () => {
    const ctx = await warmShell();
    const cache = ctx.caches[ctx.cacheName]!;
    for (let i = 0; i < 400; i += 1) {
      await fetchAsset(ctx, `${SCOPE}thumbs/a-${i}.png`);
    }
    // The cap applies to evictable assets; the protected shell sits on top.
    const shellHrefs = new Set(SHELL_PAGES.map((p) => new URL(p, SCOPE).href));
    const assets = Array.from(cache.entries.keys()).filter((u) => !shellHrefs.has(u));
    expect(assets.length).toBeLessThanOrEqual(300);
  }, 30_000);
});
