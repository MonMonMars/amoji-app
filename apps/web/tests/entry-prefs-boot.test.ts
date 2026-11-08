import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');

describe('entry funnel prefs/profile boot flash', () => {
  it('select board holds prefs chrome; /mode soft-lands on /select with chrome', () => {
    const mode = readFileSync(join(web, 'app/mode/page.tsx'), 'utf8');
    expect(mode).toContain('SoftLandSelect');
    expect(mode).toContain('ModeRedirect');
    const soft = readFileSync(join(web, 'components/SoftLandSelect.tsx'), 'utf8');
    expect(soft).toContain('replaceSelect(router, selectReturnFrom)');
    expect(soft).toContain('aria-busy');
    expect(soft).toContain('bg-neutral-950');
    const board = readFileSync(join(web, 'components/SelectionBoard.tsx'), 'utf8');
    expect(board).toContain('prefsReady');
    expect(board).toContain('boardMode');
    expect(board).toContain('castGender');
  });

  it('QuickSetup holds chrome until prefs sync', () => {
    const setup = readFileSync(join(web, 'components/QuickSetup.tsx'), 'utf8');
    expect(setup).toContain('const [prefs, , prefsReady] = usePrefs()');
    expect(setup).toContain('const startDisabled = !prefsReady || busy || !readToEnd');
    expect(setup).toContain('disabled={startDisabled}');
  });
});
