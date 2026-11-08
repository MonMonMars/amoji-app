import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');

/** Slice one exported function body so assertions cannot leak across functions. */
function fnBody(name: string, nextName: string): string {
  const start = voice.indexOf(`export function ${name}`);
  const end = voice.indexOf(nextName, start);
  return voice.slice(start, end === -1 ? undefined : end);
}

const greet = fnBody('playVoiceGreeting', 'previewLibraryClip');
const preview = fnBody('previewVoiceChoice', 'const TEST_LINES');

describe('voice restore — one tier speaks, never two', () => {
  it('the greeting starts the HTTP MP3 tier (the only live tier)', () => {
    expect(greet).toContain('speakGtts(');
    expect(greet).toContain("onStart('gtts')");
  });

  it('the greeting keeps Edge preferred if it ever answers again', () => {
    expect(greet).toContain('speakEdge(');
    expect(greet).toContain("onStart('edge')");
  });

  it('the greeting still primes synth in the tap as the last resort', () => {
    expect(greet).toContain('primeSynthInGesture(true)');
    expect(greet).toContain('unlockAudio(true)');
    expect(greet).toContain('stopSpeaking()');
    expect(greet).toContain("runSynthAudition('greeting fallback')");
  });

  it('the greeting tracks the winner so only one tier speaks', () => {
    // `spokenBy` is what stops Edge + gtts + synth all firing at once, which is
    // a regression I introduced when I first wired gtts in.
    expect(greet).toContain('spokenBy');
    expect(greet).toMatch(/if \(spokenBy === 'gtts'\) return/);
    expect(greet).toMatch(/if \(spokenBy && spokenBy !== 'gtts'\) return/);
  });

  it('does not start synth while the MP3 tier is still in flight', () => {
    expect(greet).toContain('gttsPending');
    expect(greet).toMatch(/if \(gttsPending\) return/);
    expect(greet).toMatch(/!gttsPending\)/);
  });

  it('the preview path uses the same one-winner structure', () => {
    expect(preview).toContain('speakGtts(');
    expect(preview).toContain('speakEdge(');
    expect(preview).toContain('spokenBy');
    expect(preview).toMatch(/if \(spokenBy === 'gtts'\) return/);
    expect(preview).toContain("runSynthAudition('preview fallback')");
  });

  it('the MP3 tier halts only the browser engine, never itself', () => {
    // haltSynthQueue() now stops gtts too. Calling it from gtts' own onPlaying
    // would cancel the line that just started. The gtts handlers are the ones
    // guarded by `spokenBy !== 'gtts'`.
    const idx = voice.indexOf("if (spokenBy && spokenBy !== 'gtts') return;");
    expect(idx).toBeGreaterThan(-1);
    const handler = voice.slice(idx, idx + 220);
    expect(handler).toContain('haltBrowserSynth()');
    expect(handler).not.toContain('haltSynthQueue()');
    // Both the greeting and the preview gtts handler must use the safe halt.
    expect((voice.match(/this IS the MP3 tier, so a full halt would stop us/g) ?? []).length).toBe(2);
  });

  it('haltSynthQueue stops every engine, including the MP3 tier', () => {
    const start = voice.indexOf('function haltSynthQueue');
    const end = voice.indexOf('interface SpeechJob', start);
    const halt = voice.slice(start, end);
    expect(halt).toContain('haltBrowserSynth()');
    expect(halt).toContain('stopGtts()');
  });

  it('haltBrowserSynth clears the synthPrimed latch so force reprime can run', () => {
    const start = voice.indexOf('function haltBrowserSynth');
    const end = voice.indexOf('function haltSynthQueue', start);
    const halt = voice.slice(start, end);
    expect(halt).toContain('synthPrimed = false');
    expect(halt).toContain('speechSynthesis.cancel()');
    // It must NOT touch the MP3 tier — that is the split's whole point.
    expect(halt).not.toContain('stopGtts');
  });

  it('synthSpeak pumps immediately when syncGesture', () => {
    const start = voice.indexOf('function synthSpeak(');
    const block = voice.slice(start);
    expect(block).toContain('syncGesture = false');
    expect(block).toContain('if (syncGesture)');
    expect(block).toContain('pump();');
  });
});
