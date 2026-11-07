import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/StatusPlate.tsx'), 'utf8');

describe('StatusPlate live status regions', () => {
  it('announces app status via role=status (SoftLand parity, no explicit aria-live)', () => {
    expect(src).toContain('role="status"');
    expect(src).toContain('STATUS_LABEL[status]');
    expect(src).toMatch(/role="status"[\s\S]{0,120}STATUS_LABEL\[status\]/);
    expect(src).not.toContain('aria-live');
  });

  it('marks the loading chip busy + status for preparing/percent announcements', () => {
    expect(src).toMatch(/role="status"\s+aria-busy="true"/);
    expect(src).toContain("t(lang, 'statusPreparing')");
    expect(src).toContain('{loadingPct}%');
  });
});
