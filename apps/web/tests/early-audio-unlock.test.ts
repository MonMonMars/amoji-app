import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('EarlyAudioUnlock (iPhone pre-chat gesture)', () => {
  it('primes full chat audio stack on first pointer/key/touch gesture', () => {
    const unlock = read('components/EarlyAudioUnlock.tsx');
    expect(unlock).toContain("import { primeAudioForChatEnter } from '../lib/voice'");
    expect(unlock).toContain('primeAudioForChatEnter()');
    expect(unlock).toContain("'pointerdown'");
    expect(unlock).toContain("'keydown'");
    expect(unlock).toContain("'touchstart'");
    expect(unlock).toContain('{ once: true, passive: true }');
    expect(unlock).not.toContain('playEnter');
    expect(unlock).not.toMatch(/playCheer|OPEN_CHEER|cheer\(/);
  });

  it('mounts on login + SoftLand + SelectionBoard (before /chat)', () => {
    expect(read('app/login/page.tsx')).toContain('EarlyAudioUnlock');
    expect(read('components/SoftLandSelect.tsx')).toContain('EarlyAudioUnlock');
    expect(read('components/SoftLandChat.tsx')).toContain('EarlyAudioUnlock');
    expect(read('components/SelectionBoard.tsx')).toContain('EarlyAudioUnlock');
  });

  it('login Continue/Skip call primeAudioForChatEnter in the click gesture', () => {
    const login = read('app/login/page.tsx');
    expect(login).toContain('primeAudioForChatEnter()');
    expect(login).toMatch(/const go = \(\) => \{[\s\S]*?primeAudioForChatEnter\(\)/);
    expect(login).toContain("router.push('/select')");
  });
});
