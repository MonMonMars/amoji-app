import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/chat/page.tsx'), 'utf8');

describe('chat settings gear a11y button type', () => {
  it('marks the Settings control type=button (parity with StatusPlate)', () => {
    expect(src).toContain('type="button"');
    expect(src).toContain('onClick={() => setSheetOpen(true)}');
    const typeIdx = src.indexOf('type="button"');
    const clickIdx = src.indexOf('onClick={() => setSheetOpen(true)}');
    expect(typeIdx).toBeGreaterThan(-1);
    expect(typeIdx).toBeLessThan(clickIdx);
  });
});
