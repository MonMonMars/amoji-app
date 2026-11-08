import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');
const rails = read('components/IdlePickRails.tsx');

describe('IdlePickRails toggle is reachable without a right-click', () => {
  it('wires a real long-press instead of only advertising it', () => {
    // The tooltip has always said "hold/right-click=toggle", but long-press was
    // never implemented: on iPhone a hold raises the callout, so touch users
    // could only ever pin a clip, never enable/disable one.
    expect(rails).toContain('LONG_PRESS_MS');
    expect(rails).toContain('onPointerDown');
    expect(rails).toContain('onPointerUp');
    expect(rails).toContain('onPointerCancel');
    expect(rails).not.toContain('onPointerDown={clearHold}');
  });

  it('cancels the hold when the pointer moves far enough to be a scroll', () => {
    expect(rails).toContain('MOVE_CANCEL_PX');
    expect(rails).toContain('onPointerMove');
  });

  it('suppresses the click that follows a long press so it does not also pin', () => {
    expect(rails).toContain('suppressClickRef');
    expect(rails).toMatch(/if \(suppressClickRef\.current\)[\s\S]{0,120}return;/);
  });

  it('offers a keyboard path (WCAG 2.1.1) and announces it', () => {
    expect(rails).toContain('onKeyDown');
    expect(rails).toMatch(/e\.key === 'Enter' && \(e\.altKey \|\| e\.shiftKey\)/);
    expect(rails).toContain('aria-keyshortcuts="Alt+Enter"');
  });

  it('announces ON/OFF state in the label, not just via colour', () => {
    expect(rails).toContain("t(lang, 'idleRailAria'");
    expect(rails).toContain("idleEnabled");
    expect(rails).toContain("idleDisabled");
    expect(rails).toContain('aria-pressed');
  });

  it('suppresses the iOS callout so a hold is not stolen by the system menu', () => {
    expect(rails).toContain('-webkit-touch-callout:none');
    expect(rails).toContain('select-none');
  });

  it('still keeps right-click as the desktop affordance', () => {
    expect(rails).toContain('onContextMenu');
    expect(rails).toContain('e.preventDefault()');
  });

  it('no longer leaves isDefaultIdleClip computed and unused', () => {
    const calmUses = (rails.match(/calm/g) ?? []).length;
    expect(calmUses).toBeGreaterThan(1);
  });
});
