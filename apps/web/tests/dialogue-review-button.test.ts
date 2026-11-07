import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/dialogue-review/page.tsx'), 'utf8');

describe('dialogue-review type=button', () => {
  it('every <button> declares type=button', () => {
    const tags = src.match(/<button\b[\s\S]*?>/g) ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(6);
    for (const tag of tags) {
      if (tag.length > 500) continue;
      expect(tag).toMatch(/type\s*=\s*["']button["']/);
    }
  });

  it('copy / add / bulk / line controls are typed', () => {
    expect(src).toContain('type="button" className="drv-copy"');
    expect(src).toContain('type="button" className="drv-add"');
    expect(src).toMatch(/type="button"[\s\S]{0,40}setAll\(sec\.key, 'keep'\)/);
    expect(src).toMatch(/type="button"[\s\S]{0,80}className=\{`drv-line/);
  });
});
