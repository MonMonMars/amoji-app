import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const css = readFileSync(join(web, 'app/globals.css'), 'utf8');

describe('every focusable control has a visible focus indicator', () => {
  it('declares a baseline :focus-visible ring for native and custom controls', () => {
    for (const sel of [
      'button:focus-visible',
      'a:focus-visible',
      '[role="button"]:focus-visible',
      '[tabindex]:not([tabindex="-1"]):focus-visible',
    ]) {
      expect(css).toContain(sel);
    }
  });

  it('the baseline ring actually paints something visible', () => {
    // Pull the baseline block and check it is not an empty rule.
    const i = css.indexOf('visible keyboard focus for custom controls');
    expect(i).toBeGreaterThan(-1);
    const block = css.slice(i, i + 900);
    expect(block).toMatch(/outline:\s*2px solid/);
    expect(block).toContain('outline-offset');
  });

  it('keeps .ui-btn and .ui-card rings (more specific, unchanged)', () => {
    expect(css).toContain('.ui-btn:focus-visible');
    expect(css).toContain('.ui-card:focus-visible');
  });

  it('does not add a ring to programmatically-focused containers', () => {
    // Dialogs use tabIndex={-1} purely to receive focus; a ring there would
    // outline the whole modal. The baseline selector must exclude them.
    expect(css).toContain('[tabindex]:not([tabindex="-1"]):focus-visible');
  });

  it('respects reduced motion by not animating the ring', () => {
    // outline/box-shadow only — nothing to disable, but guard against someone
    // later adding a transition to the focus ring.
    const i = css.indexOf('visible keyboard focus for custom controls');
    const block = css.slice(i, i + 900);
    expect(block).not.toContain('transition');
  });
});
