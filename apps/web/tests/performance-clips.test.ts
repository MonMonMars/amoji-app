import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_CLIPS, clipLabel, performanceGain, pickPerformanceClip,
} from '../lib/performance-clips';
import { clearSpeechLevel, feedSpeechLevel, sampleSpeech } from '../lib/speech';
import { startLibraryPerformance } from '../lib/music';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/audio/library');

function looksLikeMp3(file: string): void {
  const buf = fs.readFileSync(file);
  expect(buf.length).toBeGreaterThan(1000);
  const id3 = buf.toString('ascii', 0, 3) === 'ID3';
  const sync = buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0;
  expect(id3 || sync).toBe(true);
}

describe('premade sing and dance library', () => {
  it('has female and male sung voices plus several dance beds', () => {
    const songs = PERFORMANCE_CLIPS.filter((c) => c.kind === 'song');
    const dances = PERFORMANCE_CLIPS.filter((c) => c.kind === 'dance');
    const female = songs.filter((s) => s.voice === 'female');
    const male = songs.filter((s) => s.voice === 'male');
    expect(female.length).toBeGreaterThanOrEqual(3);
    expect(male.length).toBeGreaterThanOrEqual(3);
    expect(new Set(songs.map((s) => s.style)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(dances.map((s) => s.style)).size).toBeGreaterThanOrEqual(3);
    for (const c of songs) expect(c.volume).toBe('voiceVol');
    for (const c of dances) {
      expect(c.volume).toBe('bgmVol');
      expect(c.voice).toBeUndefined();
    }
    for (const c of PERFORMANCE_CLIPS) {
      expect(['CC0-1.0', 'PD']).toContain(c.license);
      expect(c.file).toMatch(/\.mp3$/);
    }
  });

  it('matches the sung voice to character gender', () => {
    for (let n = 0; n < 8; n++) {
      const female = pickPerformanceClip({ kind: 'song', gender: 'female', lang: 'en', n });
      const male = pickPerformanceClip({ kind: 'song', gender: 'male', lang: 'ja', n });
      expect(female.voice).toBe('female');
      expect(female.file).toMatch(/sing-f-/);
      expect(male.voice).toBe('male');
      expect(male.file).toMatch(/sing-m-/);
    }
  });

  it('mood and gender narrow the pool, and a dance ask names a preset', () => {
    for (let n = 0; n < 6; n++) {
      const male = pickPerformanceClip({ kind: 'song', gender: 'male', mood: 'happy', n });
      expect(male.voice).toBe('male');
      expect(male.moods).toContain('happy');
      const female = pickPerformanceClip({ kind: 'song', gender: 'female', mood: 'sad', n });
      expect(female.voice).toBe('female');
      expect(female.moods).toContain('sad');
    }
    const firstDance = PERFORMANCE_CLIPS.find((c) => c.kind === 'dance')!;
    const dance = pickPerformanceClip({ kind: 'dance', lang: 'en', n: 0 });
    expect(dance.id).toBe(firstDance.id);
    expect(dance.kind).toBe('dance');
  });

  it('names the preset, and names the voice on a song', () => {
    const song = pickPerformanceClip({ kind: 'song', gender: 'male', lang: 'en', n: 0 });
    expect(clipLabel(song, 'en')).toMatch(/male/);
    expect(clipLabel(song, 'yue')).toContain('男聲');
    expect(clipLabel(song, 'zh')).toContain('男声');
    const female = pickPerformanceClip({ kind: 'song', gender: 'female', lang: 'ja', n: 0 });
    expect(clipLabel(female, 'ja')).toContain('女性');
    const dance = pickPerformanceClip({ kind: 'dance', lang: 'en', n: 0 });
    expect(clipLabel(dance, 'en')).toBe(dance.labels.en);
    expect(clipLabel(dance, 'en')).not.toMatch(/female|male|女聲|男聲|女声|男声|女性|男性/);
  });

  it('scales with the dialogue and BGM steps', () => {
    const song = PERFORMANCE_CLIPS.find((c) => c.id === 'sing-f-hello-there')!;
    const dance = PERFORMANCE_CLIPS.find((c) => c.id === 'dance-8bit-disco-loop')!;
    expect(performanceGain(song, 80)).toBeCloseTo(0.92 * 0.8);
    expect(performanceGain(dance, 40)).toBeCloseTo(0.8 * 0.4);
    expect(performanceGain(song, 80, 0.28)).toBeCloseTo(0.92 * 0.8 * 0.28);
    expect(performanceGain(dance, 0)).toBe(0);
  });

  it('ships every catalogued mp3, documented as CC0', () => {
    const mp3s = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3'));
    const files = PERFORMANCE_CLIPS.map((c) => path.basename(c.file));
    expect(new Set(mp3s)).toEqual(new Set(files));
    const doc = fs.readFileSync(path.join(DIR, 'LIBRARY.md'), 'utf8');
    expect(doc).toMatch(/CC0/);
    expect(doc).toMatch(/female/i);
    expect(doc).toMatch(/male/i);
    for (const f of files) {
      expect(doc).toContain(f);
      looksLikeMp3(path.join(DIR, f));
    }
  });

  it('a song level drives the existing lip-sync clock', () => {
    const now = Date.now();
    feedSpeechLevel(0.42, 'ou', 2000, now);
    const live = sampleSpeech(now + 20);
    expect(live?.mouth).toBeCloseTo(0.42);
    expect(live?.vowel).toBe('ou');
    clearSpeechLevel();
    const after = sampleSpeech(now + 20);
    const stillFed = after?.vowel === 'ou' && Math.abs((after?.mouth ?? -1) - 0.42) < 0.001;
    expect(stillFed).toBe(false);
  });

  it('selects a dance preset without starting audio under node', () => {
    const clip = startLibraryPerformance({ kind: 'dance', lang: 'en', gender: 'female', n: 0, ms: 1000 });
    expect(clip.kind).toBe('dance');
    expect(clip.file).toMatch(/\.mp3$/);
    expect(PERFORMANCE_CLIPS.some((c) => c.id === clip.id && c.kind === 'dance')).toBe(true);
  });
});
