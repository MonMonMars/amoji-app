import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const page = readFileSync(join(__dirname, '../app/dialogue-review/page.tsx'), 'utf8');

describe('dialogue-review Copy-result a11y', () => {
  it('gives both Copy result controls a stable aria-label', () => {
    const tags = page.match(/<button type="button" className="drv-copy"[^>]*>/g) ?? [];
    expect(tags.length).toBe(2);
    for (const tag of tags) {
      expect(tag).toContain('aria-label={copyResultLabel}');
      expect(tag).toContain('onClick={copyResult}');
    }
  });

  it('keeps visible copied/copy text flip', () => {
    expect(page).toContain("copied ?");
    expect(page).toContain('Copy result');
  });
});
