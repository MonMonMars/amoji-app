import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');

describe('entry funnel prefs/profile boot flash', () => {
  it('select board holds prefs chrome; /mode page removed', () => {
    expect(existsSync(join(web, 'app/mode/page.tsx'))).toBe(false);
    const board = readFileSync(join(web, 'components/SelectionBoard.tsx'), 'utf8');
    expect(board).toContain('prefsReady');
    expect(board).toContain('boardMode');
    expect(board).toContain('castGender');
  });

  it('holds /login lang+name chrome until prefs+profile sync', () => {
    const login = readFileSync(join(web, 'app/login/page.tsx'), 'utf8');
    expect(login).toContain('const [prefs, , prefsReady] = usePrefs()');
    expect(login).toContain('useState<string | null>(null)');
    expect(login).toContain('const bootReady = prefsReady && name !== null');
    expect(login).toContain("bootReady ? '' : 'opacity-0'");
    expect(login).toContain('aria-busy={!bootReady}');
    expect(login).toContain('if (name === null) return');
    expect(login).toContain('disabled={!bootReady}');
    expect(login).toContain('ensureUserNameFromProfile');
  });
});
