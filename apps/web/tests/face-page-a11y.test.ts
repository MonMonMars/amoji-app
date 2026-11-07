import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/face/page.tsx'), 'utf8');

describe('face page main a11y', () => {
  it('labels main landmark and emotion canvas', () => {
    expect(src).toContain('aria-label="Amoji face"');
    expect(src).toContain('role="img"');
    expect(src).toContain('aria-label="Emotion face"');
  });

  it('exposes mode + subtitle as live status', () => {
    expect(src).toContain('role="status"');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('{MODE_LABEL[mode]}');
    expect(src).toContain('{said}');
  });
});
