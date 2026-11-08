import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const src = readFileSync(join(__dirname, '../components/SetupFlow.tsx'), 'utf8');

describe('SetupFlow Step N of M localized a11y', () => {
  it('localizes each progress step label via setupStepOf', () => {
    expect(src).toContain('const stepLabel = (n: number, total: number) =>');
    expect(src).toContain("t(lang, 'setupStepOf'");
    expect(src).toContain('aria-label={stepLabel(i + 1, STEPS.length)}');
    expect(src).not.toContain('aria-label={`Step ${i + 1} of ${STEPS.length}`}');
    expect(t('en', 'setupStepOf', { n: '1', total: '3' })).toContain('Step 1 of 3');
    expect(t('ja', 'setupStepOf', { n: '2', total: '3' })).toContain('3 中の 2');
  });

  it('keeps Setup progress + Next localization', () => {
    expect(src).toContain("aria-label={t(lang, 'setupProgress')}");
    expect(src).toContain("aria-label={step < STEPS.length - 1 ? t(lang, 'next') : t(lang, 'startChat')}");
  });
});
