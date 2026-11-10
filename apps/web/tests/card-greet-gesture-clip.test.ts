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
    // Must not gate the first play on pinDefaultOutputAsync.
    const sync = clip.slice(clip.indexOf('export function playGestureClipSync'));
    const body = sync.slice(0, sync.indexOf('export function playVoiceClip'));
    expect(body).not.toMatch(/pinDefaultOutputAsync\(audio\)\s*\.then\(\s*\(\)\s*=>\s*audio\.play/);
  });

  it('playVoiceGreeting starts the local clip before speakGtts', () => {
    const body = fnBody('playVoiceGreeting', 'export function previewLibraryClip');
    expect(body).toContain('playGestureClipSync');
    expect(body).toContain('clipFile(lang, gender, insuranceKind)');
    expect(body.indexOf('playGestureClipSync')).toBeLessThan(body.indexOf('speakGtts('));
    expect(body).toContain('stopVoiceClip()');
  });

  it('previewVoiceChoice also starts the local insurance clip', () => {
    const body = fnBody('previewVoiceChoice', 'export function previewOsVoice');
    expect(body).toContain('playGestureClipSync');
    expect(body.indexOf('playGestureClipSync')).toBeLessThan(body.indexOf('speakGtts('));
  });

  it('gtts plays without awaiting setSinkId first', () => {
    const marker = gtts.indexOf('Play in this turn');
    expect(marker).toBeGreaterThan(-1);
    const window = gtts.slice(marker, marker + 200);
    expect(window).toContain('void audio.play()');
    // Immediate play comes before any sink-pin-then-play chain in this window.
    expect(window.indexOf('void audio.play()')).toBeLessThan(
      window.includes('pinDefaultOutputAsync(audio)')
        ? window.indexOf('pinDefaultOutputAsync(audio)')
        : Number.POSITIVE_INFINITY,
    );
  });
});
