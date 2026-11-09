import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('one-click bootstrap — unified routes', () => {
  const alias = read('components/OneClickBootstrap.tsx');
  const setup = read('app/setup/page.tsx');
  const gate = read('app/gate/page.tsx');

  it('OneClickBootstrap re-exports QuickSetup', () => {
    expect(alias).toContain("from './QuickSetup'");
  });

  it('primary and legacy routes all mount the same scroll UI', () => {
    expect(setup).toContain('QuickSetup');
    expect(gate).toContain('QuickSetup');
    expect(read('app/rules/page.tsx')).toContain('QuickSetup');
    expect(read('app/rules/page.tsx')).toContain('viewOnly');
    for (const rel of ['app/privacy/page.tsx', 'app/terms/page.tsx', 'app/safety/page.tsx'] as const) {
      expect(read(rel)).toContain('QuickSetup');
    }
  });

  it('/setup supports ?view=1 for returning-user rules reading', () => {
    expect(setup).toContain("params.get('view') === '1'");
    expect(setup).toContain('viewOnly={viewOnly}');
  });
});

