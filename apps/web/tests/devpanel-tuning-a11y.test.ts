import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/DevPanel.tsx'), 'utf8');

describe('DevPanel localized tuning labels a11y', () => {
  it('localizes region + toggle via COPY[lang]', () => {
    expect(src).toContain("import { loadPrefs, type Lang } from '../lib/prefs'");
    expect(src).toContain('const copy = COPY[loadPrefs().lang] ?? COPY.en');
    expect(src).toContain('aria-label={copy.region}');
    expect(src).toContain('aria-label={copy.toggle}');
    expect(src).toContain('{copy.summary}');
    expect(src).toContain("region: '開發調校'");
    expect(src).toContain("region: '开发调试'");
    expect(src).toContain("region: '開発チューニング'");
    expect(src).not.toContain('aria-label="dev tuning"');
    expect(src).not.toContain('aria-label="Toggle dev tuning"');
  });
});
