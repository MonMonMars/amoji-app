import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOTDIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOTDIR, rel), 'utf8');
}

describe('DemoPhaseRail scroll (iPhone + drag)', () => {
  it('keeps overflow-x scroll, touch pan, and deferred pointer-drag wiring', () => {
    const src = read('components/DemoPhaseRail.tsx');
    expect(src).toContain('overflow-x-auto');
    expect(src).toContain('touch-action:pan-x');
    expect(src).toContain('-webkit-overflow-scrolling:touch');
    expect(src).toContain('onPointerDown');
    expect(src).toContain('onPointerMove');
    expect(src).toContain('scrollLeft');
    expect(src).toContain('skipClickRef');
    expect(src).toContain('data-testid="demo-phase-rail"');
    // Tap jitter must not eat chip clicks — threshold ≥ 16px.
    expect(src).toMatch(/DRAG_CLICK_PX\s*=\s*(1[6-9]|[2-9]\d)/);
    expect(src).toContain('skipClickRef.current = drag.moved');
    // Capture only after a real drag — immediate rail capture kills chip clicks in Chrome.
    expect(src).toContain('setPointerCapture');
    expect(src).toMatch(/if \(!drag\.captured\)[\s\S]*setPointerCapture/);
    expect(src).toMatch(/onPointerDown[\s\S]*Do NOT capture yet/);
  });

  it('rotates prompts via demoPhasePrompt + per-chip tap count', () => {
    const src = read('components/DemoPhaseRail.tsx');
    expect(src).toContain('demoPhasePrompt');
    expect(src).toContain('tapCountRef');
  });

  it('ChatPanel wires DemoPhaseRail onPick into send()', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('<DemoPhaseRail');
    expect(panel).toContain('void send(prompt)');
    expect(panel).toContain('disabled={busy}');
  });
});
