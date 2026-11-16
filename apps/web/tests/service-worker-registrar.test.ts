import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const registrar = readFileSync(join(here, '../components/ServiceWorkerRegistrar.tsx'), 'utf8');

describe('ServiceWorkerRegistrar', () => {
  it('probes for updates and nudges refresh when a new worker is waiting', () => {
    expect(registrar).toContain("register('./sw.js')");
    expect(registrar).toContain('updatefound');
    expect(registrar).toContain('visibilitychange');
    expect(registrar).toContain('location.reload');
    expect(registrar).toContain('APP_REVISION');
  });
});