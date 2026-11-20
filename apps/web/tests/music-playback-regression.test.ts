import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('music playback regression (r214 performance-session)', () => {
  it('startLibraryPerformance swaps beds without endPerformanceSession', () => {
    const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    const startLib = music.slice(
      music.indexOf('export function startLibraryPerformance'),
      music.indexOf('export function duckLibraryBed'),
    );
    expect(startLib).toContain('haltPerformanceAudioOnly');
    expect(startLib).not.toMatch(/\bendPerformanceMusic\(\)/);
    expect(music).toMatch(/function haltPerformanceAudioOnly[\s\S]*haltClip/);
    expect(music).toMatch(/export function endPerformanceMusic[\s\S]*haltPerformanceAudioOnly/);
    expect(music).toMatch(/export function endPerformanceMusic[\s\S]*endPerformanceSession/);
  });

  it('BGM unlock + speaker route before post-intro beds', () => {
    const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    const prime = music.slice(
      music.indexOf('function primeLibraryBedPlayback'),
      music.indexOf('function writeClipGain'),
    );
    expect(prime).toContain('ensureCompanionPlaybackRoute');
    expect(prime).toContain('primeSharedAudioContext');
    expect(prime).toContain('ac.resume');
    const playEl = music.slice(music.indexOf('function playClipElement'), music.indexOf('async function playClip'));
    expect(playEl).toContain('htmlAudioStartMode');
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    const begin = panel.slice(panel.indexOf('const beginShow ='), panel.indexOf('const playMusicPick'));
    expect(begin).toContain('resumeVoiceEngines');
    expect(begin).toMatch(/whenSpeechIdle[\s\S]*resumeVoiceEngines[\s\S]*startLibraryPerformance/);
  });
});
