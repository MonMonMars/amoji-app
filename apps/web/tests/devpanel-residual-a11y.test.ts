import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const panel = readFileSync(join(__dirname, '../components/DevPanel.tsx'), 'utf8');

describe('DevPanel residual a11y', () => {
  it('exposes the panel as a labeled region', () => {
    expect(panel).toContain('role="region"');
    expect(panel).toContain('aria-label={copy.region}');
    expect(panel).toContain('{copy.summary}');
  });

  it('keeps labeled sliders and adds spoken valuetext', () => {
    expect(panel).toContain('htmlFor={`amoji-dev-${s.key}`}');
    expect(panel).toContain('id={`amoji-dev-${s.key}`}');
    expect(panel).toContain('aria-valuetext=');
    expect(panel).toContain("s.unit ?? ''");
  });
});
