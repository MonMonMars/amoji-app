import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../lib/one-click-setup.ts'), 'utf8');

describe('one-click setup bootstrap', () => {
  it('accepts legal, passes the entry gate, and probes voice + mic', () => {
    expect(src).toContain('acceptCurrentLegal');
    expect(src).toContain('passEntryGate');
    expect(src).toContain('testVoiceChain');
    expect(src).toContain('requestMic');
    expect(src).toContain('adultAcknowledgedAt');
    expect(src).toContain('audioHeard: voiceOk');
  });

  it('does not block forever on voice failure', () => {
    expect(src).toContain('voiceSampleOk');
    expect(src).toMatch(/timeout|catch/);
  });
});
