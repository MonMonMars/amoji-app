/**
 * Card taps must start a same-origin greeting clip inside the gesture so
 * offline / blocked gTTS / post-gesture play() never leave the select board silent.
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

describe('card greet gesture insurance clip', () => {
  it('exposes playGestureClipSync that plays before awaiting sink pin', () => {
    expect(clip).toContain('export function playGestureClipSync');
    expect(clip).toMatch(/void audio\.play\(\)/);
    const sync = clip.slice(clip.indexOf('export function playGestureClipSync'));
    const body = sync.slice(0, sync.indexOf('export function playVoiceClip'));
    // First play must be sync in the gesture — no await pin-then-play for start.
    expect(body).not.toMatch(/await pinDefaultOutputAsync/);
    expect(body.indexOf('void audio.play()')).toBeLessThan(body.indexOf('pinDefaultOutputAsync'));
    // Must retry after pin when the gesture play rejects (Chrome sink race).
    expect(body).toMatch(/pinDefaultOutputAsync\(audio\)[\s\S]*audio\.play\(\)/);
    // Never pin inside onplay — setSinkId mid-stream mutes non-Yue TTS.
    expect(body).not.toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutput\(/);
    expect(body).not.toMatch(/current = audio;\s*\n\s*pinDefaultOutput\(audio\)/);
  });

  it('playVoiceGreeting starts the local clip before speakGtts', () => {
    const body = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
    expect(body).toContain('playGestureClipSync');
    expect(body).toContain('clipFile(lang, delivery, insuranceKind)');
    expect(body.indexOf('playGestureClipSync')).toBeLessThan(body.indexOf('speakGtts('));
    expect(body).toContain('stopVoiceClip()');
    // Hold insurance briefly after onPlaying — immediate stop left cards silent
    // when gTTS onplay fired then died after sink re-pin (#406/#413).
    const gttsCall = body.slice(body.indexOf('void speakGtts'), body.indexOf('}).then(() => {', body.indexOf('void speakGtts')));
    expect(gttsCall).toContain('onPlaying:');
    expect(gttsCall).toContain('stopVoiceClip()');
    expect(gttsCall).toContain("onStart('gtts')");
    expect(gttsCall).toMatch(/setTimeout\([\s\S]*?stopVoiceClip\(\)[\s\S]*?,\s*220\)/);
    expect(gttsCall.indexOf("onStart('gtts')")).toBeLessThan(gttsCall.indexOf('setTimeout('));
  });

  it('previewVoiceChoice does not stack synth over a still-playing insurance clip', () => {
    const body = fnBody('previewVoiceChoice', 'export function previewOsVoice');
    expect(body).toContain('isVoiceClipPlaying()');
    expect(body).toMatch(/isVoiceClipPlaying\(\)[\s\S]*runSynthAudition\('preview fallback'\)/);
  });

  it('previewVoiceChoice also starts the local insurance clip', () => {
    const body = fnBody('previewVoiceChoice', 'export function previewOsVoice');
    expect(body).toContain('playGestureClipSync');
    expect(body.indexOf('playGestureClipSync')).toBeLessThan(body.indexOf('speakGtts('));
    const gttsCall = body.slice(body.indexOf('const gtts = speakGtts'), body.indexOf('}).catch(', body.indexOf('const gtts = speakGtts')));
    expect(gttsCall).toContain('stopVoiceClip()');
    expect(gttsCall).toMatch(/setTimeout\([\s\S]*?stopVoiceClip\(\)[\s\S]*?,\s*220\)/);
  });

  it('gtts plays without awaiting setSinkId first', () => {
    const marker = gtts.indexOf('Play in this turn');
    expect(marker).toBeGreaterThan(-1);
    const window = gtts.slice(marker, marker + 280);
    expect(window).toContain('void audio.play()');
    // No parallel pin during start — only reject-retry may pin then play.
    expect(window).not.toMatch(/void audio\.play\(\)[\s\S]*void pinDefaultOutputAsync\(audio\)\.catch/);
  });

  it('gtts does not pinDefaultOutput before play or inside onplay', () => {
    const playNext = gtts.slice(gtts.indexOf('const playNext = () => {'), gtts.indexOf('playNext();\n  });'));
    const create = playNext.indexOf('const audio = new Audio');
    const onplay = playNext.indexOf('audio.onplay = () => {', create);
    const firstPlay = playNext.indexOf('void audio.play()', onplay);
    expect(create).toBeGreaterThan(-1);
    expect(onplay).toBeGreaterThan(create);
    expect(firstPlay).toBeGreaterThan(onplay);
    // Setup between new Audio and first play must not kick setSinkId at all.
    expect(playNext.slice(create, firstPlay)).not.toMatch(/pinDefaultOutput\(audio\)/);
    // onplay body must not call pin — only the reject-retry path may.
    const onplayEnd = playNext.indexOf('};', onplay);
    expect(playNext.slice(onplay, onplayEnd)).not.toMatch(/pinDefaultOutput\(/);
    expect(playNext.slice(onplay, onplayEnd)).not.toMatch(/pinDefaultOutputAsync\(/);
    expect(playNext.slice(firstPlay)).toMatch(/pinDefaultOutputAsync\(audio\)/);
  });
});
