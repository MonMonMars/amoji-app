import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../components/EarlyAudioWarm.tsx'), 'utf8');

describe('EarlyAudioWarm prefsReady hold', () => {
  it('waits for prefsReady before runEarlyAudioPreload (no DEFAULT_PREFS latch)', () => {
    expect(src).toContain('prefsReady');
    expect(src).toContain('if (!prefsReady) return');
    expect(src).toContain('[prefsReady, prefs.character, prefs.lang]');
    expect(src).toMatch(/const \[prefs,\s*,\s*prefsReady\] = usePrefs\(\)/);
  });
});
