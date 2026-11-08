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
  });

  it('mounts on title + select path (before /chat)', () => {
    expect(read('app/page.tsx')).toContain('EarlyAudioUnlock');
    expect(read('components/QuickSetup.tsx')).toContain('EarlyAudioUnlock');
    expect(read('components/SelectionBoard.tsx')).toContain('EarlyAudioUnlock');
  });

  it('one-click START calls primeAudioForChatEnter inside the tap', () => {
    const bootstrap = read('lib/one-click-setup.ts');
    expect(bootstrap).toContain('primeAudioForChatEnter()');
    expect(bootstrap).toContain('testVoiceChain');
    expect(bootstrap).toContain('acceptCurrentLegal');
    const splash = read('app/page.tsx');
    expect(splash).toContain('oneClickBootstrap');
    expect(splash).toContain("router.push('/select')");
  });
});
