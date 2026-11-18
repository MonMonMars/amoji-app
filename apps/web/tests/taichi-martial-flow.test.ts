import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('taichi demo / idle rail (lib_C121)', () => {
  const canvas = readFileSync(join(root, 'components/CompanionCanvas.tsx'), 'utf8');
  const demo = readFileSync(join(root, 'lib/demo-phase.ts'), 'utf8');

  it('maps taichi move to idle-rail lib_C121', () => {
    expect(canvas).toMatch(/taichi:\s*'lib_C121'/);
  });

  it('does not plant-lock martial tai chi at VRMA load', () => {
    expect(canvas).toContain('idlePlantLock');
    expect(canvas).toMatch(/rebaseClipHips\(clip,\s*idlePlantLock\)/);
  });

  it('loops lib_C121 performances (no LoopOnce freeze)', () => {
    const playPerf = canvas.slice(canvas.indexOf('const playPerf ='), canvas.indexOf('const startClipEngine'));
    expect(playPerf).toContain('loopPerf');
    expect(playPerf).toContain("name.startsWith('lib_C')");
    expect(playPerf).toContain('clampWhenFinished = false');
  });

  it('demo-phase chip exists at taichi id', () => {
    expect(demo).toMatch(/id:\s*'taichi'/);
  });
});