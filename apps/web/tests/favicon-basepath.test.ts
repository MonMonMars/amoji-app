import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Live Pages (/amoji-app) emitted href=/icon.svg (404); /amoji-app/icon.svg is 200.
describe('favicon metadata basePath', () => {
  const layout = readFileSync(resolve(__dirname, '../app/layout.tsx'), 'utf8');

  it('does not hardcode bare /icon.svg in metadata icons', () => {
    const dq = String.fromCharCode(34);
    const sq = String.fromCharCode(39);
    expect(layout.includes('icon: ' + dq + '/icon.svg' + dq)).toBe(false);
    expect(layout.includes('icon: ' + sq + '/icon.svg' + sq)).toBe(false);
  });

  it('prefixes icon with NEXT_PUBLIC_BASE_PATH via BASE_PATH', () => {
    expect(layout.includes('const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH')).toBe(true);
    const tick = String.fromCharCode(96);
    const needle = 'icon: ' + tick + '${BASE_PATH}/icon.svg' + tick;
    expect(layout.includes(needle)).toBe(true);
  });
});
