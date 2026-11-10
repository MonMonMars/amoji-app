import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('Settings / setup LangChips audition', () => {
  it('Settings language cards call playVoiceGreeting like select ArcFan', () => {
    const sheet = read('components/SettingsSheet.tsx');
    expect(sheet).toContain('playVoiceGreeting');
    expect(sheet).toContain('activeVoiceChoice');
    expect(sheet).toMatch(/LangChips[\s\S]*playVoiceGreeting\(me\.id,\s*l,\s*activeVoiceChoice\(l\)\.id\)/);
  });

  it('SetupFlow language step also auditions the active voice', () => {
    const setup = read('components/SetupFlow.tsx');
    expect(setup).toContain('playVoiceGreeting');
    expect(setup).toMatch(
      /LangChips[\s\S]*playVoiceGreeting\(prefs\.character,\s*l,\s*activeVoiceChoice\(l\)\.id\)/,
    );
  });
});
