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

/** Martial demo chips: kung fu and tai chi both run through the #526 speak
 *  gate, using the local lib_C120 / lib_C121 VRMAs. */
describe('martial demo chip sync (#526 kung fu VRMA sync)', () => {
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

  it('taichi and kungfu intercepts use the martial speak gate and library clips', () => {
    const canvas = read('components/CompanionCanvas.tsx');
    expect(canvas).toMatch(/taichi:\s*'lib_C121'/);
    expect(canvas).toMatch(/kungfu:\s*'lib_C120'/);
    const panel = read('components/ChatPanel.tsx');
    // #526: one-shot martial flow for both kinds; speech comes from the guard,
    // which only uses perform copy once the clip is armed in the canvas.
    expect(panel).toContain("x === 'kungfu' || x === 'taichi'");
    expect(panel).toContain('martialFlowDemoTurn');
    expect(panel).toContain('triggerMove(flow.move');
  });

  it('martial intercept ends any dance/sing show before it arms the move', () => {
    // A stale performance profile would make playPerf play the show clip
    // instead of lib_C120 / lib_C121, i.e. kung fu speech with dance motion.
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toMatch(
      /if \(x === 'kungfu' \|\| x === 'taichi'\) \{[\s\S]{0,400}?endPerformanceMusic\(\);[\s\S]{0,400}?triggerMove\(flow\.move/,
    );
  });
});