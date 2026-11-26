import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pickPerformanceClip } from '../lib/performance-clips';
import { curatedMusicBed, curatedTrackForStyle } from '../lib/music-stream-bed';

/**
 * Owner report 2026-11-25: "I pressed the music button, first the music won't
 * play, it play some do do strange sound".
 *
 * The Mixkit preview CDN answers 403 to a browser <audio> (verified live:
 * MEDIA_ERR_SRC_NOT_SUPPORTED code 4), and the old bed fallback called
 * `startMusic()` — the WebAudio tone generator — so a failed bed became a
 * synthetic "do do do" while the UI still announced a real track.
 *
 * Contract under test: a music bed failure re-resolves to REAL audio
 * (curated Jamendo, then a bundled CC0 clip) and never to the tone generator.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');

describe('music bed never degrades to the procedural band', () => {
  it('the bed fallback starts a real source — curated Jamendo, then a bundled clip', () => {
    const fallback = MUSIC.slice(
      MUSIC.indexOf('function startRealBedFallback'),
      MUSIC.indexOf('function haltClip'),
    );
    expect(fallback.length).toBeGreaterThan(0);
    // Rung 1: keyless curated Jamendo (CORS-safe, same-origin proxyable).
    expect(fallback).toContain('curatedTrackForStyle');
    expect(fallback).toContain('curatedMusicBed');
    // Rung 2: a bundled CC0 clip.
    expect(fallback).toContain('pickPerformanceClip');
    // Rung 3: honest silence — never the tone generator.
    expect(fallback).not.toContain('startMusic');
    // `playing` must come from the real element/buffer, not a bespoke emit.
    expect(fallback).not.toContain('emitLibraryClipPlaying');
    expect(fallback).toContain('playClip(');
  });

  it('the procedural band is only reachable from ambience / piano performances', () => {
    const calls = MUSIC.split('\n')
      .map((line, i) => ({ line, i: i + 1 }))
      .filter(({ line }) => /(^|[^A-Za-z])startMusic\(/.test(line))
      .filter(({ line }) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
      // the declaration itself
      .filter(({ line }) => !line.includes('export function startMusic'));
    expect(calls.length).toBe(1);
    expect(calls[0]!.line).toContain("if (kind === 'band') startMusic(characterId);");
  });

  it('does not retry a bed host the browser already rejected as unplayable', () => {
    // 403 → MEDIA_ERR_SRC_NOT_SUPPORTED (code 4) is remembered per host …
    expect(MUSIC).toMatch(/audio\.error\?\.code === 4\) noteDeadBed\(url\)/);
    // … and the resolver skips that host instead of burning another silent try.
    expect(MUSIC).toContain('bedHostDead(owner.url)');
    expect(MUSIC).toContain('bedHostDead(mixkit.url)');
  });

  it('no library/perf path names the old synthetic fallback', () => {
    expect(MUSIC).not.toContain('startLibraryBandFallback');
    expect(MUSIC).toContain('startRealBedFallback');
  });
});

describe('real beds the fallback can actually reach', () => {
  it('curated Jamendo resolves a playable https track for any style', () => {
    for (const style of [undefined, 'pop', 'jazz', 'cantopop', 'dance']) {
      const track = curatedTrackForStyle(style, 0);
      expect(track, String(style)).not.toBeNull();
      const bed = curatedMusicBed(track!);
      expect(bed.id.startsWith('stream:')).toBe(true);
      expect(bed.file).toMatch(/^https:\/\//);
      expect(bed.durationMs).toBeGreaterThan(0);
    }
  });

  it('a bundled CC0 bed exists for the dance fallback', () => {
    const bed = pickPerformanceClip({ kind: 'dance', bed: true, n: 0 });
    expect(bed.id.length).toBeGreaterThan(0);
    expect(bed.file.endsWith('.mp3')).toBe(true);
    expect(bed.durationMs).toBeGreaterThan(8_000);
  });
});
