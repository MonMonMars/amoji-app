import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SetupFlow.tsx'), 'utf8');

describe('SetupFlow progress + Back a11y', () => {
  it('marks setup progress group and current step', () => {
    expect(src).toContain('role="group"');
    expect(src).toContain("aria-label={t(lang, 'setupProgress')}");
    expect(src).toContain("aria-current={i === step ? 'step' : undefined}");
  });

  it('labels Back and Next/start controls', () => {
    expect(src).toContain("aria-label={t(lang, 'back')}");
    expect(src).toContain("aria-label={step < STEPS.length - 1 ? t(lang, 'next') : t(lang, 'startChat')}");
    expect(src).toContain('type="button"');
  });
});
