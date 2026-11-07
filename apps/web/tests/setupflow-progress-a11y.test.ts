import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/SetupFlow.tsx'), 'utf8');

describe('SetupFlow progress/Next localized a11y', () => {
  it('localizes Setup progress + Next in yue/zh/ja/en', () => {
    expect(src).toContain('const setupProgress =');
    expect(src).toContain('const nextLabel =');
    expect(src).toContain("lang === 'yue' ? '設定進度'");
    expect(src).toContain("lang === 'zh' ? '设置进度'");
    expect(src).toContain("lang === 'ja' ? 'セットアップの進行状況'");
    expect(src).toContain("lang === 'yue' ? '下一步'");
    expect(src).toContain("lang === 'ja' ? '次へ'");
    expect(src).toContain('aria-label={setupProgress}');
    expect(src).toContain("aria-label={step < STEPS.length - 1 ? nextLabel : t(lang, 'startChat')}");
    expect(src).not.toContain('aria-label="Setup progress"');
  });

  it('keeps Back + main landmark', () => {
    expect(src).toContain("aria-label={t(lang, 'back')}");
    expect(src).toContain('aria-labelledby="amoji-setup-title"');
  });
});
