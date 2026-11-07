import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const canvas = readFileSync(join(here, '../components/CompanionCanvas.tsx'), 'utf8');

describe('load-progress cleanup (Pages / chat remount hygiene)', () => {
  it('clears StatusPlate progress on CompanionCanvas unmount', () => {
    // Effect teardown: clear watchdog then retire shared load-progress.
    expect(canvas).toMatch(
      /clearTimeout\(loadWatchdog\);\s*\n\s*\/\/[\s\S]{0,180}?setLoadProgress\(null\);/,
    );
  });

  it('clears progress immediately when WebGL init fails', () => {
    expect(canvas).toMatch(
      /new THREE\.WebGLRenderer[\s\S]{0,160}?catch \{[\s\S]{0,120}?clearTimeout\(loadWatchdog\);[\s\S]{0,80}?setLoadProgress\(null\);[\s\S]{0,80}?reason: 'webgl'/,
    );
  });
});
