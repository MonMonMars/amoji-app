import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StatusPlate.tsx'), 'utf8');

describe('StatusPlate a11y button type', () => {
  it('marks the open-select control type=button (no implicit submit)', () => {
    expect(src).toContain('type="button"');
    expect(src).toContain('onClick={onOpenSelect}');
    const typeIdx = src.indexOf('type="button"');
    const clickIdx = src.indexOf('onClick={onOpenSelect}');
    expect(typeIdx).toBeGreaterThan(-1);
    expect(typeIdx).toBeLessThan(clickIdx);
  });
});
