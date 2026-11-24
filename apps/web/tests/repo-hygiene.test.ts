import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// Guards the guard: scripts/check-repo-hygiene.mjs exists because a
// `git worktree remove` walked a junctioned node_modules and deleted tracked
// sources under packages/. See docs/WORKTREE_SAFETY.md.

const repoRoot = join(__dirname, '..', '..', '..');
const checker = join(repoRoot, 'scripts', 'check-repo-hygiene.mjs');
const tempRoots: string[] = [];

function tempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'amoji-hygiene-'));
  tempRoots.push(dir);
  mkdirSync(join(dir, 'packages', 'foo', 'src'), { recursive: true });
  writeFileSync(join(dir, 'packages', 'foo', 'src', 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: dir });
  return dir;
}

function check(root: string, extra: string[] = []) {
  const result = spawnSync(process.execPath, [checker, '--root', root, ...extra], {
    encoding: 'utf8',
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

afterAll(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

describe('repo hygiene guard', () => {
  it('passes on this checkout', () => {
    const result = spawnSync(process.execPath, [checker], { cwd: repoRoot, encoding: 'utf8' });
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });

  it('fails when a tracked file under packages/ is missing', () => {
    const dir = tempRepo();
    rmSync(join(dir, 'packages', 'foo', 'src', 'a.ts'));

    const result = check(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain('packages/foo/src/a.ts');
    expect(result.output).toContain('git checkout -- packages/');
  });

  it('passes on a clean temp checkout', () => {
    expect(check(tempRepo()).status).toBe(0);
  });

  it('warns about a node_modules junction into another checkout, and fails with --strict', () => {
    const dir = tempRepo();
    const other = tempRepo();
    const link = join(other, 'node_modules');
    try {
      symlinkSync(join(dir, 'packages'), link, process.platform === 'win32' ? 'junction' : 'dir');
    } catch {
      return; // no symlink privilege in this environment
    }

    const warned = check(other);
    expect(warned.status).toBe(0);
    expect(warned.output).toContain('node_modules');
    expect(warned.output).toContain('outside this checkout');

    expect(check(other, ['--strict']).status).toBe(1);
    // Windows: two temp checkouts plus four git-backed hygiene scans. Under
    // full-suite load this exceeded the 5s default and flaked CI.
  }, 60_000);
});
