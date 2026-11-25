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

  it('the greeting still primes audio in the tap, and synth is the last hop only', () => {
    expect(greet).not.toContain('primeSynthInGesture(true)');
    expect(greet).toContain('unlockAudioForCardAudition()');
    expect(greet).toContain('stopSpeakingForCardAudition()');
    expect(greet).toContain('primeDefaultSpeakerBeforeSynth()');
    expect(greet).not.toContain('stopSpeaking()');
    expect(greet).toContain("runSynthAudition('greeting fallback')");
    expect(greet).toContain('greeting neural retry');
    // The device voice is the terminal hop. gTTS answers 404 to any browser
    // media load that carries a Referer (measured for all four locales), so a
    // path that stops before synth leaves every button mute — the owner bug.
    expect(greet).toContain('const auditionSynth');
    expect(greet).toMatch(/const auditionSynth = \(tag: string\): void => \{[\s\S]*?if \(stale\(\) \|\| spokenBy\) return;/);
    // Synth must never start from the primary gTTS path — only from the
    // neural-retry/dead-Edge fallbacks that run after the other tiers failed.
    expect(greet).not.toMatch(/const runSynthAudition = \(tag: string\) => \{[\s\S]{0,80}?synthSpeak\(/);
  });

  it('the greeting tracks the winner so only one tier speaks', () => {
    // `spokenBy` is what stops Edge + gtts + synth all firing at once, which is
    // a regression I introduced when I first wired gtts in.
    expect(greet).toContain('spokenBy');
    // 2026-11-25 (owner: two voices overlapping): the winner is decided by an
    // explicit claim, and claiming STOPS the other tier's element instead of
    // merely returning from its callback while it keeps playing.
    expect(greet).toContain('createAuditionClaim(');
    expect(greet).toMatch(/if \(!claim\.claim\('gtts'\)\) return;/);
    expect(greet).toMatch(/if \(!claim\.claim\('edge'\)\) return;/);
    expect(greet).toMatch(/if \(!claim\.claim\('synth'\)\) return;/);
  });

  it('does not start synth while the MP3 tier is still in flight', () => {
    expect(greet).toContain('gttsPending');
    expect(greet).toMatch(/if \(gttsPending\)/);
    // Grace timer skips synth while gTTS is pending (no insurance clip path).
    expect(greet).toMatch(/spokenBy \|\| gttsPending/);
    expect(greet).toContain('greeting edge claim-then-die');
    expect(greet).not.toContain('playGestureClipSync');
    expect(greet).not.toContain('startInsurance');
  });

  it('the preview path uses the same one-winner structure', () => {
    expect(preview).toContain('speakGtts(');
    expect(preview).toContain('speakEdge(');
    expect(preview).toContain('spokenBy');
    expect(preview).toContain('createAuditionClaim(');
    expect(preview).toMatch(/if \(!claim\.claim\('gtts'\)\) return;/);
    expect(preview).toMatch(/if \(!claim\.claim\('edge'\)\) return;/);
    expect(preview).not.toContain('playGestureClipSync');
    expect(preview).not.toContain('startInsurance');
    expect(preview).toContain("runSynthAudition('preview fallback')");
  });

  it('the MP3 tier stops the OTHER engines, never itself', () => {
    // haltSynthQueue() stops gtts too, so calling it from gtts' own onPlaying
    // would cancel the line that just started. The claim owns that split: its
    // stop map lists every tier, and it skips the claiming tier.
    for (const body of [greet, preview]) {
      expect(body).toMatch(
        /stop: \{\s*edge: \(\) => stopEdge\(\),\s*gtts: \(\) => stopGtts\(\),\s*synth: \(\) => haltBrowserSynth\(\),\s*\}/,
      );
    }
    // The gtts handler must not call a full halt or stop itself by hand.
    const gttsHandler = greet.slice(
      greet.indexOf('pitchBias: gttsPitchForLang'),
      greet.indexOf('const greetEdgeOpts'),
    );
    expect(gttsHandler).toContain("claim.claim('gtts')");
    expect(gttsHandler).not.toContain('haltSynthQueue()');
    expect(gttsHandler).not.toContain('stopGtts()');
    // The Edge handler must not hand-stop itself either; the claim does it.
    const edgeHandler = greet.slice(
      greet.indexOf('const greetEdgeOpts'),
      greet.indexOf('const auditionSynth'),
    );
    expect(edgeHandler).toContain("claim.claim('edge')");
    expect(edgeHandler).not.toContain('stopEdge()');
    expect(greet).not.toContain('haltSynthQueue');
    expect(preview).not.toContain('haltSynthQueue');
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
