import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('LiveRevisionBadge', () => {
  it('is used on splash, settings, and setup for stale deploy visibility', () => {
    const badge = read('components/LiveRevisionBadge.tsx');
    expect(badge).toContain('fetchLiveRevision');
    expect(badge).toContain('revisionStale');
    expect(read('app/page.tsx')).toContain('LiveRevisionBadge');
    expect(read('components/SettingsSheet.tsx')).toContain('LiveRevisionBadge');
    expect(read('components/QuickSetup.tsx')).toContain('LiveRevisionBadge');
  });
});