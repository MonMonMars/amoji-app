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
    expect(greet).toContain('primeSynthInGesture(true)');
    expect(greet).toContain('greeting gesture');
    expect(greet).toContain('greeting fallback');
    expect(greet).toContain('haltSynthQueue()');
    expect(greet).toContain('speakEdge(');
  });

  it('settings preview mirrors greeting gesture Edge synth path', () => {
    const start = voice.indexOf('export function previewEdgeVoice');
    const end = voice.indexOf('export function testVoice(', start);
    const block = voice.slice(start, end);
    expect(block).toContain('primeSynthInGesture(true)');
    expect(block).toContain('preview gesture');
    expect(block).toContain('preview fallback');
    expect(block).toContain('speakEdge(');
  });

  it('chat Edge failure with pinned id still falls through to synth', () => {
    expect(voice).toContain('Pinned Edge id failed');
    expect(voice).toContain('unlockAudio(true)');
    expect(voice).not.toContain('if (voiceId) { settle(); return; }');
  });

  it('haltSynthQueue clears synthPrimed latch so force reprime can run', () => {
    const haltStart = voice.indexOf('function haltSynthQueue');
    const haltEnd = voice.indexOf('interface SpeechJob', haltStart);
    const halt = voice.slice(haltStart, haltEnd);
    expect(halt).toContain('synthPrimed = false');
  });

  it('primeSynthInGesture accepts force after cancel', () => {
    expect(voice).toContain('export function primeSynthInGesture(force = false)');
    expect(voice).toContain('if (synthPrimed && !force) return');
  });

  it('greeting/preview audition is sync in-gesture (no 180ms defer)', () => {
    const greetStart = voice.indexOf('export function playVoiceGreeting');
    const greetEnd = voice.indexOf('export function previewLibraryClip', greetStart);
    const greet = voice.slice(greetStart, greetEnd);
    expect(greet).toContain("runSynthAudition('greeting gesture')");
    expect(greet).not.toContain('setTimeout(() => runSynthAudition');
    expect(greet).toContain('primeSynthInGesture(true)');
    expect(greet).toMatch(/synthSpeak\([\s\S]*?,\s*true\)/);

    const prevStart = voice.indexOf('export function previewEdgeVoice');
    const prevEnd = voice.indexOf('export function testVoice(', prevStart);
    const prev = voice.slice(prevStart, prevEnd);
    expect(prev).toContain("runSynthAudition('preview gesture')");
    expect(prev).not.toContain('setTimeout(() => { void runSynthAudition');
    expect(prev).toContain('primeSynthInGesture(true)');
  });

  it('synthSpeak pumps immediately when syncGesture', () => {
    const start = voice.indexOf('function synthSpeak(');
    const block = voice.slice(start);
    expect(block).toContain('syncGesture = false');
    expect(block).toContain('if (syncGesture)');
    expect(block).toContain('pump();');
  });

  it('window gesture listeners never pass the Event into force', () => {
    // primeSynthInGesture(force) is truthy for any Event argument, so a bare
    // listener reference would force-reprime on every keystroke and interrupt
    // the line that is speaking.
    expect(voice).not.toContain('addEventListener(ev, primeSynthInGesture');
    expect(voice).toContain('window.addEventListener(ev, () => primeSynthInGesture(), { passive: true })');
  });

  it('voice.ts has balanced braces around the prime block', () => {
    const start = voice.indexOf('let synthPrimed = false;');
    const end = voice.indexOf('/** r2026-10-04.75: fired on `window`', start);
    const block = voice.slice(start, end);
    const opens = (block.match(/\{/g) ?? []).length;
    const closes = (block.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});
