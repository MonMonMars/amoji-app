import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

/** Every surface that declares itself modal must also trap Tab. */
const MODALS = [
  'components/LegalGate.tsx',
  'components/SettingsSheet.tsx',
  'components/WardrobeSwap.tsx',
  'components/MiniGamePicker.tsx',
  'components/CrisisHelplineDialog.tsx',
] as const;

describe('all aria-modal dialogs trap focus', () => {
  for (const rel of MODALS) {
    const src = read(rel);
    const name = rel.replace('components/', '').replace('.tsx', '');

    it(`${name}: declares aria-modal and uses the shared focus trap`, () => {
      expect(src).toContain('aria-modal="true"');
      // A dialog that claims to be modal while Tab can leave it lies to
      // assistive tech — that is the defect this guards against.
      expect(src).toContain('useFocusTrap');
      expect(src).toContain("from '../lib/use-focus-trap'");
    });

    it(`${name}: the trap ref is attached to the dialog element`, () => {
      expect(src).toMatch(/ref=\{\w*[Rr]ef\}/);
      expect(src).toMatch(/tabIndex=\{-1\}/);
    });
  }

  it('LegalGate is a mandatory gate, so it must trap (keyboard could skip it)', () => {
    const gate = read('components/LegalGate.tsx');
    expect(gate).toMatch(/useFocusTrap<HTMLDivElement>\(ready && !accepted\)/);
    expect(gate).toContain('ref={gateRef}');
  });

  it('the shared hook wraps at both ends and recaptures escaped focus', () => {
    const hook = read('lib/use-focus-trap.ts');
    expect(hook).toContain("if (e.key !== 'Tab') return;");
    expect(hook).toMatch(/e\.shiftKey && active_ === first/);
    expect(hook).toMatch(/!e\.shiftKey && active_ === last/);
    expect(hook).toMatch(/!root\.contains\(active_\)/);
    // Nothing focusable inside must not mean "Tab into the page behind".
    expect(hook).toMatch(/items\.length === 0[\s\S]{0,160}preventDefault/);
  });

  it('the hook is inert while the dialog is closed', () => {
    const hook = read('lib/use-focus-trap.ts');
    expect(hook).toMatch(/if \(!active\) return;/);
  });
});
