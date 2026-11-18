import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  beginPerformanceSession,
  endPerformanceSession,
  getPerformanceSession,
  shouldDeferClearOnBedStop,
  syncPerformanceBed,
  takePendingBodyForPlaying,
} from '../lib/performance-session';
import type { PerformanceClip } from '../lib/performance-clips';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const stubClip = (id: string, kind: 'song' | 'dance' = 'dance'): PerformanceClip => ({
  id,
  kind,
  style: 'pop',
  file: `/audio/${id}.mp3`,
  durationMs: 12_000,
  volume: kind === 'song' ? 'voiceVol' : 'bgmVol',
  moods: [],
  langs: ['en'],
  characters: ['default'],
  labels: { en: id, yue: id, zh: id, ja: id },
  license: 'CC0-1.0',
  credit: 'test',
  source: 'test',
});

describe('performance-session', () => {
  beforeEach(() => {
    endPerformanceSession();
  });

  it('listen-only arms no body until dance ask', () => {
    beginPerformanceSession('dance', stubClip('mv-001'), 18_000, true);
    expect(getPerformanceSession().listenOnly).toBe(true);
    expect(getPerformanceSession().pendingBody).toBeNull();
    expect(shouldDeferClearOnBedStop()).toBe(false);
  });

  it('sing/dance defers clear on stop while body armed', () => {
    beginPerformanceSession('song', stubClip('so-001', 'song'), 20_000, false);
    expect(shouldDeferClearOnBedStop()).toBe(true);
    const body = takePendingBodyForPlaying('so-001');
    expect(body?.bodyMove).toBe('sing');
    expect(shouldDeferClearOnBedStop()).toBe(false);
  });

  it('syncPerformanceBed refreshes hold for async decode', () => {
    beginPerformanceSession('dance', stubClip('old'), 9_000, false);
    syncPerformanceBed(stubClip('new'), 40_000);
    expect(getPerformanceSession().pendingBody?.clipId).toBe('new');
    expect(getPerformanceSession().pendingBody?.holdMs).toBe(40_000);
  });

  it('ChatPanel gates listen/sing/dance/end via performance-session', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('beginPerformanceSession');
    expect(panel).toContain('shouldDeferClearOnBedStop');
    expect(panel).toContain('takePendingBodyForPlaying');
    expect(panel).not.toContain('pendingShowDanceRef');
    expect(panel).not.toContain('pendingShowClipRef');
  });

  it('music endPerformanceMusic coordinates session + instant clip halt', () => {
    const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    expect(music).toContain('endPerformanceSession');
    const endBlock = music.slice(music.indexOf('export function endPerformanceMusic'), music.indexOf('// ---- premade library'));
    expect(endBlock).toMatch(/haltClip\(\{ fadeOutSec: 0 \}\)/);
    expect(endBlock).not.toMatch(/fadeOutSec:\s*0\.35/);
    expect(music).not.toMatch(/master\.gain\.linearRampToValueAtTime\(0,/);
    expect(music).not.toMatch(/pianoMaster\.gain\.linearRampToValueAtTime\(0,/);
    const haltClip = music.slice(music.indexOf('function haltClip'), music.indexOf('function armSongMouthFromElement'));
    expect(haltClip).not.toMatch(/gain\.gain\.linearRampToValueAtTime\(0,/);
  });
});