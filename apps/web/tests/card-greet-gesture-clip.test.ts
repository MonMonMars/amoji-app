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
    // Sink pin only after play starts (onplay) — never right after `current = audio`.
    expect(body).toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutput\(audio\)/);
    expect(body).not.toMatch(/current = audio;\s*\n\s*pinDefaultOutput\(audio\)/);
  });

  it('playVoiceGreeting starts the local clip before speakGtts', () => {
    const body = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
    expect(body).toContain('playGestureClipSync');
    expect(body).toContain('clipFile(lang, gender, insuranceKind)');
    expect(body.indexOf('playGestureClipSync')).toBeLessThan(body.indexOf('speakGtts('));
    expect(body).toContain('stopVoiceClip()');
    // When gTTS starts, kill insurance immediately — delayed hold caused dual voice.
    const gttsCall = body.slice(body.indexOf('void speakGtts'), body.indexOf('}).then(() => {', body.indexOf('void speakGtts')));
    expect(gttsCall).toContain('onPlaying:');
    expect(gttsCall).toContain('stopVoiceClip()');
    expect(gttsCall).toContain("onStart('gtts')");
    expect(gttsCall).not.toMatch(/setTimeout\(/);
    expect(gttsCall.indexOf('stopVoiceClip()')).toBeLessThan(gttsCall.indexOf("onStart('gtts')"));
  });

  it('previewVoiceChoice also starts the local insurance clip', () => {
    const body = fnBody('previewVoiceChoice', 'export function previewOsVoice');
    expect(body).toContain('playGestureClipSync');
    expect(body.indexOf('playGestureClipSync')).toBeLessThan(body.indexOf('speakGtts('));
    const gttsCall = body.slice(body.indexOf('const gtts = speakGtts'), body.indexOf('}).catch(', body.indexOf('const gtts = speakGtts')));
    expect(gttsCall).toContain('stopVoiceClip()');
    expect(gttsCall).not.toMatch(/setTimeout\(/);
  });

  it('gtts plays without awaiting setSinkId first', () => {
    const marker = gtts.indexOf('Play in this turn');
    expect(marker).toBeGreaterThan(-1);
    const window = gtts.slice(marker, marker + 200);
    expect(window).toContain('void audio.play()');
    expect(window.indexOf('void audio.play()')).toBeLessThan(
      window.includes('pinDefaultOutputAsync(audio)')
        ? window.indexOf('pinDefaultOutputAsync(audio)')
        : Number.POSITIVE_INFINITY,
    );
  });
});
