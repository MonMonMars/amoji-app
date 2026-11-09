import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../lib/one-click-setup.ts'), 'utf8');

describe('one-click setup bootstrap', () => {
  it('accepts legal and primes gesture without blocking on voice/mic', () => {
    expect(src).toContain('acceptCurrentLegal');
    expect(src).toContain('primeChatStartGesture');
    expect(src).not.toContain('passEntryGate');
    expect(src).not.toContain('testVoiceChain');
    expect(src).not.toContain('requestMic');
  });

  it('returns immediately so rules START cannot stick on audio', () => {
    expect(src).toContain('voiceOk: false');
    expect(src).not.toContain('voiceSampleOk');
  });
});
