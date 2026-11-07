import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('SoftLand label ellipsis (no mojibake)', () => {
  // The English copy moved from the component defaults into STRINGS so it can be
  // localized; the ASCII "..." rule still applies to those en entries.
  it('defaults and page overrides resolve to ASCII ... copy', () => {
    const prefs = read('lib/prefs.ts');
    expect(prefs).toContain("en: 'Taking you to character select...'");
    expect(prefs).toContain("en: 'Taking you to chat...'");
    expect(prefs).toContain("en: 'Opening story select...'");
    expect(prefs).not.toMatch(/select\?\?/);
    expect(prefs).not.toMatch(/chat\?\?/);

    const select = read('components/SoftLandSelect.tsx');
    const chat = read('components/SoftLandChat.tsx');
    expect(select).toContain("labelKey = 'softLandSelect'");
    expect(chat).toContain("labelKey = 'softLandChat'");
    expect(read('app/story/page.tsx')).toContain('labelKey="softLandStory"');
  });
});
