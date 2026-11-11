import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { t } from '../lib/prefs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('chat thinking status (not typing)', () => {
  it('i18n says thinking in every shipping language', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const line = t(lang, 'typing', { name: 'Jun' });
      expect(line.toLowerCase()).not.toMatch(/typing|入力|打字|输入/);
      expect(line).toMatch(/Jun/);
      expect(line.toLowerCase()).toMatch(/think|諗|想|考え/);
    }
  });

  it('ChatPanel shows thinking status + indeterminate bar, no percent readout', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('data-testid="thinking-status"');
    expect(panel).toContain('ui-thinking-bar');
    expect(panel).toContain('Indeterminate wait bar');
    // No live percent label like "42%" next to the thinking status.
    expect(panel).not.toMatch(/thinking-status[\s\S]{0,280}\d\s*%/);
  });

  it('ChatPanel wires thinking pose + auto idle (no spoken um)', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('setThinkingPose(true)');
    expect(panel).toContain('pushAutoIdle(\'\', undefined, true)');
    expect(panel).toContain('stopThinkingSound()');
    expect(panel).not.toMatch(/speakThinkingFiller\s*\(/);
  });

  it('CompanionCanvas prefers Thinking pose while waiting', () => {
    const canvas = fs.readFileSync(path.join(ROOT, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('thinkingPoseActive()');
    expect(canvas).toMatch(/clips\.has\('Thinking'\)\s*\?\s*'Thinking'\s*:\s*'IdleBreathCalm'/);
  });

  it('globals define the thinking-bar motion', () => {
    const css = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');
    expect(css).toContain('@keyframes fx-thinking-bar');
    expect(css).toContain('.ui-thinking-bar-fill');
  });
});
