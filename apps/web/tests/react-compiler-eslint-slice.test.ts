import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('react-compiler eslint slice (r188)', () => {
  it('MuteButton reads master mute via useSyncExternalStore (no setState in effect)', () => {
    const src = read('components/MuteButton.tsx');
    expect(src).toContain('useSyncExternalStore');
    expect(src).toContain('subscribeMasterMute');
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*setMuted/);
  });

  it('RequireEntryGate gate pass via useSyncExternalStore', () => {
    const src = read('components/RequireEntryGate.tsx');
    expect(src).toContain('useSyncExternalStore');
    expect(src).toContain('subscribeEntryGate');
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*setStatus/);
  });

  it('LegalGate legal accept + ready via useSyncExternalStore', () => {
    const src = read('components/LegalGate.tsx');
    expect(src).toContain('useSyncExternalStore');
    expect(src).toContain('subscribeLegalAccept');
    expect(src).not.toMatch(/setReady\(true\)/);
  });

  it('PreChatAudioGate loads lang/mic in useState init, not setLang in effect', () => {
    const src = read('components/PreChatAudioGate.tsx');
    expect(src).toContain('loadPrefs().lang');
    expect(src).not.toMatch(/setLang\(loadPrefs/);
    expect(src).not.toContain('eslint-disable-next-line react-hooks/set-state-in-effect');
  });

  it('scroll-unlock inactive path does not setState inside effect', () => {
    const src = read('lib/scroll-unlock.ts');
    expect(src).toContain('return active ? reached : false');
    expect(src).not.toMatch(/if \(!active\) \{\s*setReached\(false\)/);
  });

  it('SettingsSheet master mute via useSyncExternalStore (no setState in effect)', () => {
    const src = read('components/SettingsSheet.tsx');
    expect(src).toContain('useSyncExternalStore');
    expect(src).toContain('subscribeMasterMute');
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*setMasterMutedState/);
  });

  it('SettingsSheet refresh-on-open via openSnap render sync (no setState in effect)', () => {
    const src = read('components/SettingsSheet.tsx');
    expect(src).toContain('openSnap');
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*if \(open\)/);
  });
});