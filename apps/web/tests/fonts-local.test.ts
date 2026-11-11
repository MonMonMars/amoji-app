import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('self-hosted fonts (CI-safe)', () => {
  it('ships local woff2 files for Geist + Cormorant', () => {
    for (const file of [
      'app/fonts/geist-latin-400-normal.woff2',
      'app/fonts/geist-latin-500-normal.woff2',
      'app/fonts/geist-mono-latin-400-normal.woff2',
      'app/fonts/cormorant-garamond-latin-600-normal.woff2',
      'app/fonts/cormorant-garamond-latin-700-normal.woff2',
    ] as const) {
      expect(existsSync(join(web, file))).toBe(true);
    }
  });

  it('layout and splash no longer import next/font/google', () => {
    expect(read('app/layout.tsx')).not.toContain('next/font/google');
    expect(read('app/page.tsx')).not.toContain('next/font/google');
    expect(read('app/fonts.ts')).toContain('next/font/local');
    expect(read('app/layout.tsx')).toContain('from "./fonts"');
    expect(read('app/page.tsx')).toContain("from './fonts'");
  });
});
