import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/face/page.tsx'), 'utf8');

describe('face page residual a11y', () => {
  it('wires main to mode status + keyboard activate when not auto', () => {
    expect(src).toContain('aria-label={faceCopy.main}');
    expect(src).toContain('aria-describedby="amoji-face-mode"');
    expect(src).toContain("aria-busy={mode !== 'idle'}");
    expect(src).toContain('tabIndex={auto ? -1 : 0}');
    expect(src).toContain("e.key === 'Enter' || e.key === ' '");
    expect(src).toContain('void loopOnce()');
  });

  it('keeps mode live status id and labels debug pill as status', () => {
    expect(src).toContain('id="amoji-face-mode"');
    expect(src).toContain('role="status"');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('{MODE_LABEL[mode]}');
    // debug pill also status (third role=status with subs)
    const statusCount = (src.match(/role="status"/g) || []).length;
    expect(statusCount).toBeGreaterThanOrEqual(3);
  });
});
