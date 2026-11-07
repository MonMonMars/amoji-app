import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { STRINGS, LANGS } from '../lib/prefs';

const web = join(__dirname, '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.next', 'out', 'tests'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** All UI source, the string table itself excluded. */
const UI = sourceFiles(web)
  .filter((f) => !f.endsWith(join('lib', 'prefs.ts')))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

describe('string table hygiene', () => {
  it('every key has a non-empty value in all four shipped languages', () => {
    const missing: string[] = [];
    for (const [key, vals] of Object.entries(STRINGS)) {
      for (const { id } of LANGS) {
        const v = (vals as Record<string, string>)[id];
        if (!v || !v.trim()) missing.push(`${key}.${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('CJK values are genuinely translated, not copied English', () => {
    // `confirmCta` is the stylised "START" wordmark shown in every locale; it is
    // the one key allowed to be identical across languages.
    const INTENTIONAL = new Set(['confirmCta']);
    const copied: string[] = [];
    for (const [key, vals] of Object.entries(STRINGS)) {
      if (INTENTIONAL.has(key)) continue;
      const en = (vals as Record<string, string>).en;
      if (!en || !/[a-z]/i.test(en)) continue;
      for (const lang of ['yue', 'zh', 'ja'] as const) {
        if ((vals as Record<string, string>)[lang] === en) copied.push(`${key}.${lang}`);
      }
    }
    expect(copied).toEqual([]);
  });

  it('no key whose English is prose is unreferenced by any UI source', () => {
    // Narrow on purpose. Many keys are reached indirectly (BackgroundDef.nameKey,
    // MOOD_LABEL, STATUS_LABEL maps), so a blanket "is this string mentioned"
    // rule produces false orphans. This targets the real rot: a full prose
    // sentence still sitting in the table after the UI that rendered it was
    // deleted. Short label keys are excluded because they are usually mapped.
    const isProse = (s: string) => s.trim().split(/\s+/).length >= 4;
    const orphans = Object.keys(STRINGS).filter((key) => {
      const en = (STRINGS as Record<string, { en: string }>)[key].en;
      if (!en || !isProse(en)) return false;
      return !UI.includes(`'${key}'`) && !UI.includes(`"${key}"`);
    });
    expect(orphans).toEqual([]);
  });
});
