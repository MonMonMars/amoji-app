import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('thumb-bake main a11y', () => {
  it('labels gate and studio mains', () => {
    const src = read('app/thumb-bake/page.tsx');
    expect(src).toContain('aria-label="Thumb Bake Studio"');
    expect(src).toContain('aria-labelledby="amoji-thumb-bake-title"');
    expect(src).toContain('id="amoji-thumb-bake-title"');
    expect(src).toContain('Thumb Bake Studio');
  });
});
