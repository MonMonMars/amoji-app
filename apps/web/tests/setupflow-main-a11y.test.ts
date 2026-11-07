import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SetupFlow.tsx'), 'utf8');

describe('SetupFlow main + progress residual a11y', () => {
  it('labels main via setup title h1', () => {
    expect(src).toContain('<main');
    expect(src).toContain('aria-labelledby="amoji-setup-title"');
    expect(src).toContain('id="amoji-setup-title"');
    expect(src).toContain('aria-busy={!prefsReady}');
    expect(src).toContain('</main>');
  });

  it('names each progress step for screen readers', () => {
    expect(src).toContain('aria-label={`Step ${i + 1} of ${STEPS.length}`}');
    expect(src).toContain("aria-current={i === step ? 'step' : undefined}");
    expect(src).toContain('aria-label="Setup progress"');
  });
});
