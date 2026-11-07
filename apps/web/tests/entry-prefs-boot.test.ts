import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');

describe('entry funnel prefs/profile boot flash', () => {
  it('holds /mode language chrome until usePrefs ready', () => {
    const mode = readFileSync(join(web, 'app/mode/page.tsx'), 'utf8');
    expect(mode).toContain('const [prefs, , prefsReady] = usePrefs()');
    expect(mode).toContain("prefsReady ? '' : 'opacity-0'");
    expect(mode).toContain('aria-busy={!prefsReady}');
    expect(mode).toContain('disabled={!prefsReady}');
    expect(mode).toContain('data-testid="mode-chat"');
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
  });
});
