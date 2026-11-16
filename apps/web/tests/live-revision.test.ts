import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { revisionStale } from '../lib/live-revision';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('live revision probe', () => {
  it('detects stale bundles when live stamp differs from baked', () => {
    expect(revisionStale('r2026-11-16.164', 'r2026-11-16.165')).toBe(true);
    expect(revisionStale('r2026-11-16.165', 'r2026-11-16.165')).toBe(false);
    expect(revisionStale('r2026-11-16.165', null)).toBe(false);
  });

  it('splash and ServiceWorkerRegistrar use the shared fetch helper', () => {
    const splash = read('app/page.tsx');
    const registrar = read('components/ServiceWorkerRegistrar.tsx');
    const lib = read('lib/live-revision.ts');
    expect(lib).toContain("cache: 'no-store'");
    expect(splash).toContain('LiveRevisionBadge');
    expect(registrar).toContain('fetchLiveRevision');
  });
});