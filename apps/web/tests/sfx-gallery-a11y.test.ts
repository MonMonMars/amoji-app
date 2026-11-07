import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('sfx-gallery main a11y', () => {
  it('labels main via titled h1 and select nav link', () => {
    const src = read('app/sfx-gallery/page.tsx');
    expect(src).toContain('aria-labelledby="amoji-sfx-gallery-title"');
    expect(src).toContain('id="amoji-sfx-gallery-title"');
    expect(src).toContain('Reaction SFX gallery');
    expect(src).toContain('aria-label={backSelect}');
  });
});
