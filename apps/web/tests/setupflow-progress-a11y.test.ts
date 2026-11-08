import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const src = readFileSync(join(__dirname, '../components/SetupFlow.tsx'), 'utf8');

describe('SetupFlow progress/Next localized a11y', () => {
  it('localizes Setup progress + Next through t(lang, ...)', () => {
    expect(src).toContain("aria-label={t(lang, 'setupProgress')}");
    expect(src).toContain("aria-label={step < STEPS.length - 1 ? t(lang, 'next') : t(lang, 'startChat')}");
    expect(src).not.toContain('const setupProgress =');
    expect(src).not.toContain('const nextLabel =');
    expect(src).not.toContain('aria-label="Setup progress"');
    for (const key of ['setupProgress', 'next'] as const) {
      for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
        expect(t(lang, key).length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps Back + main landmark', () => {
    expect(src).toContain("aria-label={t(lang, 'back')}");
    expect(src).toContain('aria-labelledby="amoji-setup-title"');
  });
});
