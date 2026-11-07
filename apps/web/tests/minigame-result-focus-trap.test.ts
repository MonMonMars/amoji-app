import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const overlay = readFileSync(join(web, 'components/MiniGameOverlay.tsx'), 'utf8');

describe('MiniGameOverlay result dialog behaves like a modal', () => {
  it('moves focus into the card when the result appears', () => {
    // aria-modal="true" tells assistive tech the page behind is inert, so focus
    // must actually enter the card — otherwise the keyboard user is stranded on
    // a control the screen reader has just been told is unavailable.
    expect(overlay).toContain('resultRef');
    expect(overlay).toMatch(/hud\.phase !== 'result'[\s\S]{0,80}return;/);
    expect(overlay).toMatch(/card\.querySelector<HTMLElement>\('button:not\(\[disabled\]\)'\)/);
    expect(overlay).toMatch(/first\?\.focus\(\)/);
  });

  it('keeps Tab inside the card and wraps at both ends', () => {
    expect(overlay).toMatch(/e\.key !== 'Tab'/);
    expect(overlay).toMatch(/focusables\[0\]/);
    expect(overlay).toMatch(/focusables\[focusables\.length - 1\]/);
    expect(overlay).toMatch(/e\.shiftKey && active === firstEl/);
    expect(overlay).toMatch(/!e\.shiftKey && active === lastEl/);
  });

  it('pulls focus back if it escaped the card', () => {
    expect(overlay).toMatch(/!card\.contains\(active\)/);
  });

  it('returns focus to the game when the result closes', () => {
    expect(overlay).toMatch(/removeEventListener\('keydown', onTab\)[\s\S]{0,120}previousFocusRef\.current\?\.focus\?\.\(\)/);
  });

  it('keeps the dialog element focusable and labelled', () => {
    expect(overlay).toContain('ref={resultRef}');
    expect(overlay).toContain('aria-modal="true"');
    expect(overlay).toContain('aria-labelledby="amoji-minigame-result-line"');
    expect(overlay).toContain('tabIndex={-1}');
  });
});
