/**
 * PERMANENT LOCK — card greet / voice preview must NEVER play audible
 * insurance / gesture "robot" clips. Owner regression many times
 * (robot+female double, then robot-only forever).
 *
 * After #431 removed insurance + OS synth, cards went fully silent when
 * gTTS/Edge failed. Restore path: retry Edge/gTTS once — never OS robot
 * synth as primary, never insurance double.
 *
 * CI MUST FAIL if audible insurance or synthSpeak is reintroduced on
 * card greet / preview paths.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
const clip = readFileSync(join(__dirname, '../lib/play-voice-clip.ts'), 'utf8');
const gtts = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');

function fnBody(name: string, nextName: string): string {
  const start = voice.indexOf(`export function ${name}`);
  const end = voice.indexOf(nextName, start);
  return voice.slice(start, end === -1 ? undefined : end);
}

describe('card greet — no audible insurance (permanent)', () => {
  it('playSilentUnblock is volume 0 (never a voiced robot unlock clip)', () => {
    const start = voice.indexOf('function playSilentUnblock');
    const body = voice.slice(start, voice.indexOf('function unlockAudio', start));
    expect(body).toMatch(/a\.volume\s*=\s*0\s*;/);
    expect(body).not.toMatch(/a\.volume\s*=\s*0\.[1-9]/);
    expect(body).not.toMatch(/a\.volume\s*=\s*[1-9]/);
    expect(body).toMatch(/DO NOT reintroduce audible insurance/);
  });

  it('playVoiceGreeting never arms insurance / playGestureClipSync / greeting clipFile', () => {
    const body = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
    expect(body).toMatch(/DO NOT reintroduce audible insurance/);
    expect(body).not.toContain('playGestureClipSync');
    expect(body).not.toContain('insuranceKind');
    expect(body).not.toContain('insuranceFile');
    expect(body).not.toContain('insuranceArmed');
    expect(body).not.toContain('startInsurance');
    expect(body).not.toContain('saveWithInsuranceThenMaybeSynth');
    expect(body).not.toContain('CARD_GREET_INSURANCE');
    expect(body).toContain('greeting skip synth robot');
    expect(body).not.toMatch(/const runSynthAudition = \(tag: string\) => \{[\s\S]*?synthSpeak\(/);
    expect(body).not.toMatch(/clipFile\s*\(\s*lang\s*,/);
    expect(body).not.toContain('nextGreetingKind()');
    expect(body).not.toContain('greetingText(');
    expect(body).not.toMatch(/setTimeout\([\s\S]*?stopVoiceClip\(\)[\s\S]*?,\s*220\)/);
  });

  it('playVoiceGreeting prefers gTTS/Edge; retries neural — never OS synthSpeak', () => {
    const body = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
    expect(body).toContain('speakGtts(');
    // Helper may be declared before speakGtts; calls must still refuse while pending.
    expect(body).toMatch(/const runSynthAudition = \(tag: string\) => \{[\s\S]*?if \(spokenBy \|\| gttsPending\) return;/);
    expect(body).toContain('greeting neural retry');
    expect(body).toContain('greeting skip synth robot');
    expect(body).toContain('resetEdgeHealth');
    expect(body).not.toMatch(/const runSynthAudition = \(tag: string\) => \{[\s\S]*?synthSpeak\(/);
    expect(body).toMatch(/if \(gttsPending\)/);
    expect(body).toMatch(/edgeGrace = setTimeout\([\s\S]*?if \(spokenBy \|\| gttsPending\) return;[\s\S]*?runSynthAudition/);
    expect(body).toMatch(/greeting gtts failed[\s\S]*runSynthAudition\('greeting fallback'\)/);
    // Edge claimed-then-died must clear so neural retry can restore audio.
    expect(body).toMatch(/if \(spokenBy === 'edge'\) spokenBy = null/);
    expect(body).toContain('greeting edge claim-then-die');
    expect(body).toContain('greeting gtts canceled salvage');
    expect(body).not.toMatch(/greetEdgeOpts[\s\S]*?onPlaying[\s\S]*?haltSynthQueue\(\)/);
  });

  it('previewVoiceChoice never arms insurance / playGestureClipSync', () => {
    const body = fnBody('previewVoiceChoice', 'export function previewOsVoice');
    expect(body).toMatch(/DO NOT reintroduce audible insurance/);
    expect(body).not.toContain('playGestureClipSync');
    expect(body).not.toContain('insuranceKind');
    expect(body).not.toContain('insuranceFile');
    expect(body).not.toContain('startInsurance');
    expect(body).not.toContain('saveWithInsuranceThenMaybeSynth');
    expect(body).not.toContain('CARD_GREET_INSURANCE');
    expect(body).toContain('preview neural retry');
    expect(body).toContain('preview skip synth robot');
    expect(body).not.toMatch(/const runSynthAudition = \(tag: string\) => \{[\s\S]*?synthSpeak\(/);
    expect(body).not.toMatch(/clipFile\s*\(\s*locale\s*,/);
    expect(body).not.toContain('nextGreetingKind()');
    expect(body).not.toMatch(/setTimeout\([\s\S]*?stopVoiceClip\(\)[\s\S]*?,\s*220\)/);
    expect(body).toMatch(/if \(spokenBy \|\| gttsPending\) return/);
    expect(body).toContain('resetEdgeHealth');
  });

  it('voice.ts does not import playGestureClipSync (hard-disabled for greets)', () => {
    expect(voice).not.toMatch(/import\s*\{[^}]*playGestureClipSync[^}]*\}\s*from\s*['\"]\.\/play-voice-clip['\"]/);
    expect(voice).not.toContain('playGestureClipSync(');
  });

  it('play-voice-clip documents the permanent ban', () => {
    expect(clip).toContain('DO NOT reintroduce audible insurance');
    expect(clip).toContain('export function playGestureClipSync');
  });

  it('gtts neural path remains available for greets', () => {
    expect(gtts).toMatch(/export function speakGtts/);
  });

  it('gtts defaults to gesture-safe start; chat may opt into pin-before-play', () => {
    expect(gtts).toContain('startHtmlAudioOnDefaultSpeakers');
    expect(gtts).toContain('pinSinkBeforePlay');
    expect(gtts).toMatch(/opts\.pinSinkBeforePlay \? 'pin-before-play' : 'gesture-safe'/);
  });

  it('gtts does not pinDefaultOutput inside onplay', () => {
    const playNext = gtts.slice(gtts.indexOf('const playNext = () => {'), gtts.indexOf('playNext();\n  });'));
    const create = playNext.indexOf('const audio = new Audio');
    const onplay = playNext.indexOf('audio.onplay = () => {', create);
    expect(create).toBeGreaterThan(-1);
    expect(onplay).toBeGreaterThan(create);
    const onplayEnd = playNext.indexOf('};', onplay);
    expect(playNext.slice(onplay, onplayEnd)).not.toMatch(/pinDefaultOutput\(/);
    expect(playNext.slice(onplay, onplayEnd)).not.toMatch(/pinDefaultOutputAsync\(/);
    expect(playNext).toContain('startHtmlAudioOnDefaultSpeakers');
  });
});
