import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('SetupFlow / StorySetupPanel prefsReady chrome hold', () => {
  it('SetupFlow holds chrome until prefsReady', () => {
    const src = read('components/SetupFlow.tsx');
    expect(src).toMatch(/const \[prefs, setPrefs, prefsReady\] = usePrefs\(\)/);
    expect(src).toContain('aria-busy={!prefsReady}');
    expect(src).toContain("prefsReady ? '' : 'opacity-0'");
  });

  it('StorySetupPanel holds chrome until prefsReady', () => {
    const src = read('components/StorySetupPanel.tsx');
    expect(src).toMatch(/const \[prefs, setPrefs, prefsReady\] = usePrefs\(\)/);
    expect(src).toContain('aria-busy={!prefsReady}');
    expect(src).toContain("prefsReady ? '' : 'opacity-0'");
  });
});
