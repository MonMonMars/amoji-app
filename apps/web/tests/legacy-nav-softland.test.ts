import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEB_DIR = resolve(__dirname, '..');

const LEGACY_ROUTER_PATTERN =
  /router\.(?:push|replace)\s*\(\s*['"`]\/?(?:play|mode|story|setup)['"`]/;

const LEGACY_HREF_PATTERN =
  /href\s*=\s*["'`](?:\.\/|\/)(?:play|mode|story)["'`]/;

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function isSoftLandComponent(file: string): boolean {
  return basename(file).startsWith('SoftLand');
}

function isSoftLandPage(file: string): boolean {
  const rel = relative(join(WEB_DIR, 'app'), file);
  const parts = rel.split(sep);
  return (
    parts.length === 2 &&
    parts[1] === 'page.tsx' &&
    ['mode', 'story', 'play'].includes(parts[0])
  );
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('legacy nav after soft-lands', () => {
  it('SetupFlow pushes /chat instead of soft-land /play', () => {
    const source = read(join(WEB_DIR, 'components', 'SetupFlow.tsx'));
    expect(source).toContain("router.push('/chat')");
    expect(source).not.toContain("router.push('/play')");
  });

  it('robot-demo back link goes to ./select instead of soft-land ./setup', () => {
    const source = read(join(WEB_DIR, 'app', 'robot-demo', 'page.tsx'));
    expect(source).toContain('href="./select"');
    expect(source).not.toContain('href="./setup"');
  });

  it('soft-land pages still render SoftLand chrome', () => {
    expect(read(join(WEB_DIR, 'app', 'mode', 'page.tsx'))).toContain('SoftLandSelect');
    expect(read(join(WEB_DIR, 'app', 'story', 'page.tsx'))).toContain('SoftLandSelect');
    expect(read(join(WEB_DIR, 'app', 'play', 'page.tsx'))).toContain('SoftLandChat');
  });

  it('/setup is a first-class QuickSetup route, not a soft-land', () => {
    expect(read(join(WEB_DIR, 'app', 'setup', 'page.tsx'))).toContain('QuickSetup');
  });

  it('live UI does not navigate to soft-landed legacy routes', () => {
    const componentDir = join(WEB_DIR, 'components');
    const componentFiles = existsSync(componentDir)
      ? readdirSync(componentDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
          .map((entry) => join(componentDir, entry.name))
      : [];

    const pageFiles = walk(join(WEB_DIR, 'app')).filter((file) => basename(file) === 'page.tsx');

    const violations = [...componentFiles, ...pageFiles]
      .filter((file) => !isSoftLandComponent(file))
      .filter((file) => !isSoftLandPage(file))
      .filter((file) => {
        const source = read(file);
        return LEGACY_ROUTER_PATTERN.test(source) || LEGACY_HREF_PATTERN.test(source);
      });

    expect(violations.map((file) => relative(WEB_DIR, file).split(sep).join('/'))).toEqual([]);
  });
});
