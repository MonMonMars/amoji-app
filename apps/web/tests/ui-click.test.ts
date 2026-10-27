import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_CLICK_GAP_MS, nextUiClickAt, playUiClick } from '../lib/sfx';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(here, rel), 'utf8');

describe('button press clicks', () => {
  it('allows one tick at a time', () => {
    expect(UI_CLICK_GAP_MS).toBeLessThan(120);
    expect(nextUiClickAt(1_000, 0)).toBe(1_000 + UI_CLICK_GAP_MS);
    expect(nextUiClickAt(1_040, 1_070)).toBeNull();
    expect(nextUiClickAt(1_070, 1_070)).toBe(1_070 + UI_CLICK_GAP_MS);
  });

  it('stays quiet in node, where there is no audio context', () => {
    expect(() => playUiClick()).not.toThrow();
  });

  it('listens for every button press from the app shell', () => {
    const layout = read('../app/layout.tsx');
    const click = read('../components/UiClickSound.tsx');
    const css = read('../app/globals.css');
    expect(layout).toContain('<UiClickSound />');
    expect(click).toContain("closest('button, [role=\"button\"]')");
    expect(click).toContain('playUiClick');
    expect(click).toContain('pointerdown');
    expect(css).toContain('button:not(:disabled):active');
  });
});
