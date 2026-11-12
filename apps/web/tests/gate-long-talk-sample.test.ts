import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GATE_TEST_LINES } from '../lib/voice';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('開聲傾偈 longer gate voice sample', () => {
  it('exports longer GATE_TEST_LINES than the short settings TEST_LINES', () => {
    expect(GATE_TEST_LINES.yue.length).toBeGreaterThan(40);
    expect(GATE_TEST_LINES.en.length).toBeGreaterThan(40);
    expect(GATE_TEST_LINES.yue).toContain('開聲傾偈');
    expect(GATE_TEST_LINES.en.toLowerCase()).toContain('voice-chat');
  });

  it('PreChatAudioGate passes GATE_TEST_LINES into testVoiceChain', () => {
    const gate = read('components/PreChatAudioGate.tsx');
    expect(gate).toContain('GATE_TEST_LINES');
    expect(gate).toMatch(/testVoiceChain\(\s*characterId,\s*lang,\s*GATE_TEST_LINES/);
  });

  it('testVoiceChain accepts an optional line override', () => {
    const voice = read('lib/voice.ts');
    const start = voice.indexOf('export async function testVoiceChain');
    const slice = voice.slice(start, start + 900);
    expect(slice).toContain('lineOverride?: string');
    expect(slice).toContain('lineOverride?.trim()');
  });
});
