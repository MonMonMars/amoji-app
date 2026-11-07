import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');

describe('voice restore mute-aware Edge to synth (iPhone)', () => {
  it('select greeting primes synth in tap then auditions before Edge may fail', () => {
    const greetStart = voice.indexOf('export function playVoiceGreeting');
    const greetEnd = voice.indexOf('export function previewLibraryClip', greetStart);
    const greet = voice.slice(greetStart, greetEnd);
    expect(greet).toContain('voiceOutputAllowed()');
    expect(greet).toContain('unlockAudio(true)');
    expect(greet).toContain('stopSpeaking()');
    expect(greet).toContain('primeSynthInGesture()');
    expect(greet).toContain('greeting gesture');
    expect(greet).toContain('greeting fallback');
    expect(greet).toContain('haltSynthQueue()');
    expect(greet).toContain('speakEdge(');
  });

  it('settings preview mirrors greeting gesture Edge synth path', () => {
    const start = voice.indexOf('export function previewEdgeVoice');
    const end = voice.indexOf('export function testVoice(', start);
    const block = voice.slice(start, end);
    expect(block).toContain('primeSynthInGesture()');
    expect(block).toContain('preview gesture');
    expect(block).toContain('preview fallback');
    expect(block).toContain('speakEdge(');
  });

  it('chat Edge failure with pinned id still falls through to synth', () => {
    expect(voice).toContain('Pinned Edge id failed');
    expect(voice).toContain('unlockAudio(true)');
    expect(voice).not.toContain('if (voiceId) { settle(); return; }');
  });
});
