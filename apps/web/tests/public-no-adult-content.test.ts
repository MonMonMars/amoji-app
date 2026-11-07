import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(here, '../public');

/** Only text-ish assets can carry a forbidden word; binaries (vrm/mp3/png) cannot. */
const TEXT_EXT = new Set(['.html', '.json', '.md', '.txt', '.js', '.mjs', '.css', '.svg', '.xml', '.webmanifest', '.csv', '.ts']);

/** Words that must never ship: this app goes to app stores and is not an 18+ title. */
const ADULT_TERM = /hentai|r18|nsfw|erotic|porn/i;
/** Explicit age-gate tagging — the convention catalog.html used for adult picks. */
const ADULT_TAG = /['"]18\+['"]/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const ALL = walk(PUBLIC);
const TEXT = ALL.filter((f) => TEXT_EXT.has(path.extname(f).toLowerCase()));
const rel = (f: string) => path.relative(PUBLIC, f).replace(/\\/g, '/');

describe('public/ ships no adult content', () => {
  it('no adult term in any text asset name or body', () => {
    const offenders: string[] = [];
    for (const f of TEXT) {
      if (ADULT_TERM.test(path.basename(f))) offenders.push(rel(f) + ' (filename)');
      if (ADULT_TERM.test(fs.readFileSync(f, 'utf8'))) offenders.push(rel(f));
    }
    expect(offenders).toEqual([]);
  });

  it('no asset is age-gated with an 18+ tag', () => {
    const offenders: string[] = [];
    for (const f of TEXT) {
      if (ADULT_TAG.test(fs.readFileSync(f, 'utf8'))) offenders.push(rel(f));
    }
    expect(offenders).toEqual([]);
  });

  it('scans a non-trivial slice of public/ (guards against a silent empty walk)', () => {
    expect(TEXT.length).toBeGreaterThan(10);
    expect(ALL.length).toBeGreaterThan(100);
  });
});

// The catalogue is an internal shortlist page, not a product page, and a
// sibling branch moves it out of `public/` entirely (store-bundle exclusions).
// So locate it wherever the tree keeps it: shipped, or already relocated.
const CATALOG = [path.join(PUBLIC, 'catalog.html'), path.resolve(here, '../dev-pages/catalog.html')]
  .find((p) => fs.existsSync(p));

describe.skipIf(!CATALOG)('catalog.html stays valid after the adult rows were removed', () => {
  // Read lazily: `describe.skipIf` still runs this factory at collection time,
  // so reading at the top would throw (not skip) when the page has been moved.
  const html = () => fs.readFileSync(CATALOG!, 'utf8');

  /** Pull `const NAME = [ ... ];` out of the page and evaluate just that literal. */
  function rows(name: string): unknown[][] {
    const m = html().match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);'));
    expect(m, 'const ' + name + ' = [...] missing from catalog.html').not.toBeNull();
    return new Function('return ' + m![1])() as unknown[][];
  }

  it('every row list parses as an array literal', () => {
    for (const name of ['APP', 'HI', 'VT']) {
      expect(Array.isArray(rows(name)), name + ' did not parse').toBe(true);
    }
  });

  it('the removed adult entries are gone and the counts in the headings match', () => {
    expect(rows('HI')).toHaveLength(30);
    expect(rows('VT')).toHaveLength(14);
    expect(rows('APP')).toHaveLength(10);
    expect(html()).toContain('high-poly shortlist (30)');
    expect(html()).toContain('low-poly Vtuber shortlist (14)');
  });

  it('no row carries a name or tag that reads as adult', () => {
    const adult = [...rows('APP'), ...rows('HI'), ...rows('VT')]
      .map((r) => r.filter((v) => typeof v === 'string').join(' '))
      .filter((s) => ADULT_TERM.test(s));
    expect(adult).toEqual([]);
  });
});
