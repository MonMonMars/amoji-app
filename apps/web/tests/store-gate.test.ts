import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEV_PAGES, scan } from '../../../scripts/check-store-bundle.mjs';

function tmpOut(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'amoji-gate-'));
}

/** scan() logs a file count; keep test output readable. */
function quietScan(dir: string) {
  const log = console.log;
  const warn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    return scan(dir);
  } finally {
    console.log = log;
    console.warn = warn;
  }
}

describe('CI store-bundle gate (scripts/check-store-bundle.mjs)', () => {
  it('passes on a clean tree', () => {
    const dir = tmpOut();
    try {
      fs.writeFileSync(path.join(dir, 'index.html'), '<html>hello</html>');
      expect(quietScan(dir)).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds an adult token buried in a nested minified chunk', () => {
    const dir = tmpOut();
    try {
      fs.mkdirSync(path.join(dir, '_next', 'static', 'chunks'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), '<html>ok</html>');
      fs.writeFileSync(path.join(dir, '_next', 'static', 'chunks', 'a-1.js'), 'var x="HeNtAi";');
      const findings = quietScan(dir);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.kind).toBe('adult-token');
      expect(findings[0]?.file).toContain('a-1.js');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports an age-rating badge distinct from minified arithmetic', () => {
    const dir = tmpOut();
    try {
      fs.writeFileSync(path.join(dir, 'math.js'), 'a=18+42*t;');
      expect(quietScan(dir)).toHaveLength(0);

      fs.writeFileSync(path.join(dir, 'rows.js'), "['B23','x','f',null,'18+']");
      expect(quietScan(dir).some((f) => f.kind === 'age-badge')).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags every internal QA page by name', () => {
    const dir = tmpOut();
    try {
      for (const name of DEV_PAGES) fs.writeFileSync(path.join(dir, name), '<html>qa</html>');
      const qa = quietScan(dir)
        .filter((f) => f.kind === 'qa-page')
        .map((f) => path.basename(f.file));
      expect(qa.sort()).toEqual([...DEV_PAGES].sort());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports QA-page contents as findings too (store mode blocks them)', () => {
    // scan() is mode-agnostic: it reports everything, and main() decides what is
    // blocking. A store build must see both the page and its adult tokens.
    const dir = tmpOut();
    try {
      fs.writeFileSync(path.join(dir, 'catalog.html'), "<span>['B23','Hentai Girl','18+']</span>");
      const findings = quietScan(dir);
      expect(findings.some((f) => f.kind === 'qa-page')).toBe(true);
      expect(findings.some((f) => f.kind === 'adult-token')).toBe(true);
      expect(findings.some((f) => f.kind === 'age-badge')).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores binary assets, so a compressed model cannot fail the gate', () => {
    const dir = tmpOut();
    try {
      fs.writeFileSync(
        path.join(dir, 'model.vrm'),
        Buffer.from([0x00, 0x68, 0x65, 0x6e, 0x74, 0x61, 0x69])
      );
      expect(quietScan(dir)).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
