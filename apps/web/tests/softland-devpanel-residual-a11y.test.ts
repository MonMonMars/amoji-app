import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('SoftLand glow + DevPanel summary residual a11y', () => {
  it('hides SoftLand decorative glows from the accessibility tree', () => {
    for (const rel of ['components/SoftLandChat.tsx', 'components/SoftLandSelect.tsx'] as const) {
      const src = read(rel);
      expect(src).toContain('bg-pink-500/10 blur-3xl" aria-hidden');
      expect(src).toContain('role="status"');
      expect(src).not.toContain('aria-live');
    }
  });

  it('names the DevPanel details summary toggle', () => {
    const panel = read('components/DevPanel.tsx');
    expect(panel).toContain('aria-label={copy.toggle}');
    expect(panel).toContain('role="region"');
    expect(panel).toContain('aria-label={copy.region}');
  });
});
