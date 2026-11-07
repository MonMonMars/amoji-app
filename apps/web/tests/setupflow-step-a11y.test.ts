import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SetupFlow.tsx'), 'utf8');

describe('SetupFlow Step N of M localized a11y', () => {
  it('localizes each progress step label in yue/zh/ja/en', () => {
    expect(src).toContain('const stepLabel = (n: number, total: number) =>');
    expect(src).toContain('第 ${n} 步，共 ${total} 步');
    expect(src).toContain('${total} 中の ${n}');
    expect(src).toContain('Step ${n} of ${total}');
    expect(src).toContain('aria-label={stepLabel(i + 1, STEPS.length)}');
    expect(src).not.toContain('aria-label={`Step ${i + 1} of ${STEPS.length}`}');
  });

  it('keeps Setup progress + Next localization from #214', () => {
    expect(src).toContain('aria-label={setupProgress}');
    expect(src).toContain("aria-label={step < STEPS.length - 1 ? nextLabel : t(lang, 'startChat')}");
  });
});
