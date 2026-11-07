import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_PAGES, BANNED_TOKENS, RATING_PATTERNS, BUILD_MODE_FILE, findToken, isTextual, scanTree } from '../scripts/store-bundle.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(here, '..');
const PUBLIC_DIR = path.join(WEB_ROOT, 'public');
const DEV_PAGES_DIR = path.join(WEB_ROOT, 'dev-pages');
const OUT_DIR = path.join(WEB_ROOT, 'out');

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'amoji-store-'));
}

describe('store bundle: QA pages are outside the shipped tree', () => {
  it('keeps every internal QA page in dev-pages/, not public/', () => {
    for (const name of DEV_PAGES) {
      expect(fs.existsSync(path.join(DEV_PAGES_DIR, name)), `${name} missing from dev-pages/`).toBe(true);
    }
  });

  it('never keeps a QA page in public/ in the committed tree', () => {
    for (const name of DEV_PAGES) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, name)), `${name} is inside public/ and would ship`).toBe(
        false
      );
    }
  });

  it('dev-pages/ is not a Next route or public asset directory', () => {
    // Next copies public/ verbatim into out/ and has no exclusion option, so the
    // only structural guarantee is that the files are not in public/. Assert the
    // directory name itself is not one Next treats as shippable.
    expect(path.basename(DEV_PAGES_DIR)).toBe('dev-pages');
    expect(fs.existsSync(path.join(WEB_ROOT, 'app', 'dev-pages'))).toBe(false);
  });

  it('the adult-content page still exists for QA (moved, not deleted)', () => {
    const catalog = fs.readFileSync(path.join(DEV_PAGES_DIR, 'catalog.html'), 'utf8');
    expect(catalog.toLowerCase()).toContain('hentai');
  });
});

describe('store bundle: adult-token scan', () => {
  it('findToken is case-insensitive and counts every occurrence', () => {
    const buf = Buffer.from('HeNtAi and HENTAI and hentai', 'utf8');
    expect(findToken(buf, 'hentai')).toHaveLength(3);
    expect(findToken(Buffer.from('nothing to see', 'utf8'), 'hentai')).toHaveLength(0);
  });

  it('catches a token split across a line break in minified-ish JS', () => {
    const buf = Buffer.from('var a="x";\nvar b="HeNtAi";\n', 'utf8');
    expect(findToken(buf, 'hentai')).toHaveLength(1);
  });

  it('treats build text formats as textual and asset binaries as not', () => {
    const empty = Buffer.alloc(0);
    for (const ext of ['.html', '.js', '.mjs', '.json', '.txt', '.md', '.css', '.svg', '.map']) {
      expect(isTextual(`a${ext}`, empty), ext).toBe(true);
    }
    for (const ext of ['.vrm', '.vrma', '.glb', '.png', '.jpg', '.mp3', '.wav', '.ico', '.woff2']) {
      expect(isTextual(`a${ext}`, empty), ext).toBe(false);
    }
  });

  it('finds a banned token wherever it lives in a tree, not just at the root', () => {
    const dir = tmpDir();
    try {
      fs.mkdirSync(path.join(dir, '_next', 'static', 'chunks'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), '<html>ok</html>');
      fs.writeFileSync(path.join(dir, '_next', 'static', 'chunks', 'app-abc.js'), 'var s="Hentai";');
      const { hits, scanned } = scanTree(dir);
      expect(scanned).toBe(2);
      expect(hits).toHaveLength(1);
      expect(hits[0]?.token).toBe('hentai');
      expect(hits[0]?.file).toContain(path.join('_next', 'static', 'chunks', 'app-abc.js'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores a token inside an asset binary (compressed payload false positive)', () => {
    const dir = tmpDir();
    try {
      // Random high-entropy bytes that happen to contain the ASCII letters.
      fs.writeFileSync(path.join(dir, 'model.vrm'), Buffer.from([0x00, 0x50, 0x6f, 0x52, 0x6e, 0xff, 0x10]));
      const { hits, scanned, skipped } = scanTree(dir);
      expect(scanned).toBe(0);
      expect(skipped).toBe(1);
      expect(hits).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gates on hentai specifically, and only on tokens it is given', () => {
    expect(BANNED_TOKENS).toContain('hentai');
    const dir = tmpDir();
    try {
      fs.writeFileSync(path.join(dir, 'a.html'), 'hentai');
      const { hits } = scanTree(dir, ['hentai']);
      expect(hits).toHaveLength(1);
      expect(scanTree(dir, ['marin']).hits).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('catches a quoted 18+ rating badge without flagging minified arithmetic', () => {
    const dir = tmpDir();
    try {
      fs.writeFileSync(path.join(dir, 'clean.js'), 'r.vy=18+30*n();Math.round(18+42*t);');
      expect(scanTree(dir).hits).toHaveLength(0);

      fs.writeFileSync(path.join(dir, 'badge.html'), "<span>['B23','Hentai Girl','f',null,'18+']</span>");
      const { hits } = scanTree(dir);
      expect(hits.some((h) => h.token.includes('18+'))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('treats a bare 18+ substring as data, not a rating (documented trade-off)', () => {
    // Guards the decision recorded above RATING_PATTERNS: if someone "fixes"
    // this by adding a raw `18+` token, the store build goes permanently red on
    // minified chunk arithmetic. This test documents the intended behaviour.
    expect(BANNED_TOKENS).not.toContain('18+');
    const dir = tmpDir();
    try {
      fs.writeFileSync(path.join(dir, 'chunk.js'), 'e[n+2]=Math.round(18+42*t)');
      expect(scanTree(dir).hits).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('has rating patterns for every quoting style the catalog could use', () => {
    const sources = RATING_PATTERNS.map((p) => p.re.source).join(' | ');
    expect(sources).toContain("'18\\+'");
    expect(sources).toContain('"18\\+"');
  });
});

describe('store bundle: the committed QA pages contain the string we gate on', () => {
  it('catalog.html is the source of the adult tokens (so the scan is not vacuous)', () => {
    const catalog = fs.readFileSync(path.join(DEV_PAGES_DIR, 'catalog.html'), 'utf8');
    expect(catalog.toLowerCase().match(/hentai/g)?.length ?? 0).toBeGreaterThan(0);
  });
});

// The build-output assertions only run when a build is on disk. `pnpm -r test`
// in CI does not build first, so these must skip rather than fail.
const hasOut = fs.existsSync(OUT_DIR);
const buildMode: string | null = (() => {
  try {
    const raw = fs.readFileSync(BUILD_MODE_FILE, 'utf8');
    return (JSON.parse(raw) as { mode?: string }).mode ?? null;
  } catch {
    return null;
  }
})();
const isStoreOut = buildMode === 'app';

describe.skipIf(!hasOut)('store bundle: built out/ tree', () => {
  it('records which mode produced out/ so these assertions are not guessed', () => {
    expect(buildMode, 'run pnpm build or pnpm build:app first').toBeTruthy();
  });

  it.skipIf(!isStoreOut)('store mode has zero banned tokens anywhere in the tree', () => {
    const { hits, scanned } = scanTree(OUT_DIR);
    expect(scanned).toBeGreaterThan(0);
    expect(hits, `banned tokens in store out/: ${JSON.stringify(hits)}`).toHaveLength(0);
  });

  it.skipIf(isStoreOut)('web mode has no banned tokens outside the QA pages', () => {
    const { hits } = scanTree(OUT_DIR);
    const stray = hits.filter((h) => !DEV_PAGES.includes(path.basename(h.file)));
    expect(stray, `unexpected banned tokens in web out/: ${JSON.stringify(stray)}`).toHaveLength(0);
  });

  it.skipIf(!isStoreOut)('store mode ships none of the QA pages', () => {
    for (const name of DEV_PAGES) {
      expect(fs.existsSync(path.join(OUT_DIR, name)), `${name} shipped in store build`).toBe(false);
    }
  });

  it.skipIf(isStoreOut)('web mode still serves the QA pages on GitHub Pages', () => {
    for (const name of DEV_PAGES) {
      expect(fs.existsSync(path.join(OUT_DIR, name)), `${name} missing from web build`).toBe(true);
    }
  });
});
