import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clipTitle, performanceIntroLine } from '../lib/performance-intro';
import { pickPerformanceClip } from '../lib/performance-clips';
import { resolveLibraryPerformance } from '../lib/music';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('performance intro (name before play)', () => {
  it('clipTitle omits sung-voice suffix that clipLabel adds', () => {
    const song = pickPerformanceClip({ kind: 'song', gender: 'female', n: 0 });
    expect(clipTitle(song, 'en')).toBe(song.labels.en);
    expect(clipTitle(song, 'en')).not.toMatch(/female|male|女聲|男聲/);
  });

  it('intro lines name the piece in every shipping language', () => {
    const title = 'Twinkle Twinkle';
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const song = performanceIntroLine('song', title, lang);
      const music = performanceIntroLine('music', title, lang);
      expect(song).toContain(title);
      expect(music).toContain(title);
      expect(song.length).toBeGreaterThan(8);
      expect(music.length).toBeGreaterThan(8);
    }
    expect(performanceIntroLine('song', title, 'en')).toMatch(/song is called/i);
    expect(performanceIntroLine('music', title, 'en')).toMatch(/track is/i);
  });

  it('resolveLibraryPerformance matches startLibraryPerformance pick (stable announce)', () => {
    const q = { kind: 'song' as const, gender: 'female' as const, n: 3, lang: 'en' };
    expect(resolveLibraryPerformance(q).id).toBe(pickPerformanceClip(q).id);
  });

  it('ChatPanel announces then starts audio on speech idle', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('resolveLibraryPerformance');
    expect(panel).toContain('performanceIntroLine');
    expect(panel).toContain('clipTitle');
    expect(panel).toContain('whenSpeechIdle');
    expect(panel).toContain('startLibraryPerformance(query)');
    // History must stay copyable for Pixel nonsense reports.
    expect(panel).toContain('select-text');
    expect(panel).not.toMatch(/scrollRef[\s\S]{0,400}select-none/);
  });
});
