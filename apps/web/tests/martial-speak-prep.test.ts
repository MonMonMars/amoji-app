import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { demoPhasePrompt } from '../lib/demo-phase';
import { detectExercise, startExercise } from '../lib/exercises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Live r237 locks — full lib_C120 speak sync ships in #526 (outside #528–#543 train). */
describe('martial demo chip sync (pre #526)', () => {
  it('kungfu phase chip prompts classify as kungfu exercise in every locale', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(detectExercise(demoPhasePrompt('kungfu', lang))).toBe('kungfu');
    }
  });

  it('startExercise(kungfu) uses kungfu move on the trainer path', () => {
    const turn = startExercise('kungfu', 'en');
    expect(turn.move).toBe('kungfu');
    expect(turn.state?.kind).toBe('kungfu');
    expect(turn.line.length).toBeGreaterThan(8);
  });

  it('taichi intercept uses library lib_C121 clip (kungfu VRMA sync: #526)', () => {
    const canvas = read('components/CompanionCanvas.tsx');
    expect(canvas).toMatch(/taichi:\s*'lib_C121'/);
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain("x === 'taichi'");
    expect(panel).toContain("triggerMove('taichi')");
  });
});