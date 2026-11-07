import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const page = readFileSync(join(__dirname, '../app/dialogue-review/page.tsx'), 'utf8');

describe('dialogue-review residual a11y', () => {
  it('labels main via titled h1', () => {
    expect(page).toContain('<main className="drv-root" aria-labelledby="amoji-drv-title">');
    expect(page).toContain('id="amoji-drv-title"');
    expect(page).toContain('Amoji Dialogue Review');
    expect(page).toContain('</main>');
  });

  it('names Add + bulk keep/drop controls', () => {
    expect(page).toContain('aria-label="Add custom line"');
    expect(page).toContain('aria-label={`Mark all ${sec.title} keep`}');
    expect(page).toContain('aria-label={`Mark all ${sec.title} drop`}');
  });

  it('names each line toggle with text + verdict + next hint', () => {
    expect(page).toContain('aria-label={`${it.text}; ${v}; ${NEXT_HINT[v]}`}');
    expect(page).toContain('title={NEXT_HINT[v]}');
  });
});
