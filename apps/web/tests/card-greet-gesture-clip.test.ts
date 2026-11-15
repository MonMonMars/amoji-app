/**
 * PERMANENT LOCK — card greet / voice preview must NEVER play audible
 * insurance / gesture "robot" clips. Owner regression many times
 * (robot+female double, then robot-only forever). Prefer silence until
 * real gTTS/Edge over any local hello/hihi insurance.
 *
 * CI MUST FAIL if audible insurance is reintroduced or if synth-robot
 * is armed while neural/gTTS is still available.
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
    expect(body).not.toMatch(/clipFile\s*\(\s*lang\s*,/);
    expect(body).not.toContain('nextGreetingKind()');
    expect(body).not.toContain('greetingText(');
    expect(body).not.toMatch(/setTimeout\([\s\S]*?stopVoiceClip\(\)[\s\S]*?,\s*220\)/);
  });

  it('playVoiceGreeting prefers gTTS/Edge; synth only after gTTS is done failing', () => {
    const body = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
    expect(body).toContain('speakGtts(');
    expect(body.indexOf('speakGtts(')).toBeLessThan(body.indexOf('runSynthAudition'));
    expect(body).toMatch(/const runSynthAudition = \(tag: string\) => \{\s*if \(spokenBy \|\| gttsPending\) return;/);
    expect(body).toMatch(/if \(gttsPending\) return;/);
    expect(body).toMatch(/edgeGrace = setTimeout\([\s\S]*?if \(spokenBy \|\| gttsPending\) return;[\s\S]*?runSynthAudition/);
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
    expect(body).not.toMatch(/clipFile\s*\(\s*locale\s*,/);
    expect(body).not.toContain('nextGreetingKind()');
    expect(body).not.toMatch(/setTimeout\([\s\S]*?stopVoiceClip\(\)[\s\S]*?,\s*220\)/);
    expect(body).toMatch(/if \(spokenBy \|\| gttsPending\) return/);
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
