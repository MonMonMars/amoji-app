import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEMO_PHASE_BUTTONS,
  DEMO_PHASE_LEFT_PRIORITY_IDS,
  DEMO_PHASE_TAIL_SHUFFLE_ENABLED,
  demoPhasePrompt,
  shuffledDemoPhaseButtons,
} from '../lib/demo-phase';
import { planTools } from '../lib/live-tools';
import { isTopicalContentTurn } from '../lib/skill-offer-guard';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Pixel no-repeat regressions (r237 live)', () => {
  it('demo-phase tail shuffle is explicit — weather, news, then time stay pinned left', () => {
    expect(DEMO_PHASE_TAIL_SHUFFLE_ENABLED).toBe(true);
    expect(DEMO_PHASE_LEFT_PRIORITY_IDS).toEqual(['weather', 'news', 'time']);
    const src = read('lib/demo-phase.ts');
    expect(src).toContain('DEMO_PHASE_LEFT_PRIORITY_IDS');
    expect(src).toContain('demoPhaseTailButtons');
    expect(src).not.toContain('const arr = [...DEMO_PHASE_BUTTONS]');
    for (const seed of [7, 42, 8080, 0xdead_beef]) {
      const ids = shuffledDemoPhaseButtons(seed).map((b) => b.id);
      expect(ids.slice(0, DEMO_PHASE_LEFT_PRIORITY_IDS.length)).toEqual([...DEMO_PHASE_LEFT_PRIORITY_IDS]);
      expect(new Set(ids).size).toBe(DEMO_PHASE_BUTTONS.length);
    }
  });

  it('news + weather demo taps gather live facts and speak via sayLocal (no send/LLM)', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toMatch(/id === 'weather'[\s\S]*clientLiveContext\(prompt, lang\)/);
    expect(panel).toContain('void clientLiveContext(prompt, lang).then((live) =>');
    expect(panel).toContain('sayLocal(spoken)');
    expect(panel).not.toMatch(
      /id === 'weather'[\s\S]{0,400}void send\(prompt\)/,
    );
    for (const id of ['weather', 'news'] as const) {
      const p = demoPhasePrompt(id, 'en', 0);
      expect(isTopicalContentTurn(p)).toBe(true);
      expect(planTools(p).weather || planTools(p).news).toBe(true);
    }
  });
});