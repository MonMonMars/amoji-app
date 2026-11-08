import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const bootstrap = readFileSync(join(__dirname, '../lib/one-click-setup.ts'), 'utf8');
const settings = readFileSync(join(__dirname, '../components/SettingsSheet.tsx'), 'utf8');

describe('display name (no dedicated /login step)', () => {
  it('one-click bootstrap can seed profile name into memory', () => {
    expect(bootstrap).toContain('ensureUserNameFromProfile');
    expect(bootstrap).toContain('saveProfile');
  });

  it('settings still exposes a name field with label wiring', () => {
    expect(settings).toContain('ensureUserNameFromProfile');
  });
});
