import { describe, expect, it } from 'vitest';
import { SONG_MELODY, SONGS, CHARACTER_SONGS, pickCharacterSong, pickSong } from '../lib/songs';

describe('song bank (r2026-10-03.40)', () => {
  it('has at least 2 songs per language', () => {
    for (const lang of ['yue', 'zh', 'ja', 'en'] as const) {
      expect(SONGS[lang]?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it('every song has at least 2 non-empty lines', () => {
    for (const songs of Object.values(SONGS)) {
      for (const song of songs) {
        expect(song.length).toBeGreaterThanOrEqual(2);
        for (const line of song) expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every song has at least 4 singable phrases', () => {
    for (const songs of Object.values(SONGS)) {
      for (const song of songs) {
        const phrases = song
          .join('，')
          .split(/[,，、。]/)
          .map((s) => s.trim())
          .filter(Boolean);
        expect(phrases.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('songs end on a held note (~) or a question hook', () => {
    for (const songs of Object.values(SONGS)) {
      for (const song of songs) {
        expect(song[song.length - 1]).toMatch(/[~～?？]$/);
      }
    }
  });

  it('pickSong is deterministic and wraps around the bank', () => {
    expect(pickSong('yue', 0)).toBe(SONGS.yue![0]);
    expect(pickSong('yue', 1)).toBe(SONGS.yue![1]);
    expect(pickSong('yue', 2)).toBe(SONGS.yue![0]);
    expect(pickSong('en', 5)).toBe(SONGS.en![5 % SONGS.en!.length]);
  });

  it('melody contour is musical: 6-12 notes inside the SSML window', () => {
    expect(SONG_MELODY.length).toBeGreaterThanOrEqual(6);
    expect(SONG_MELODY.length).toBeLessThanOrEqual(12);
    for (const note of SONG_MELODY) {
      expect(note).toBeGreaterThanOrEqual(-0.1);
      expect(note).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('signature songs (r2026-10-04.48)', () => {
  it('featured characters own an original ditty in every language', () => {
    for (const songs of Object.values(CHARACTER_SONGS)) {
      for (const lang of ['yue', 'zh', 'ja', 'en'] as const) {
        const song = songs[lang];
        expect(song.length).toBeGreaterThanOrEqual(2);
        expect(song[song.length - 1]).toMatch(/[~～?？]$/);
        const phrases = song
          .join('，')
          .split(/[,，、。]/)
          .map((s) => s.trim())
          .filter(Boolean);
        expect(phrases.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('her own song wins; unknown characters fall back to the shared bank', () => {
    expect(pickCharacterSong('juno', 'yue', 0)).toBe(CHARACTER_SONGS.juno!.yue);
    expect(pickCharacterSong('mystery-id', 'en', 1)).toBe(pickSong('en', 1));
    expect(pickCharacterSong('mystery-id', 'yue', 3)).toBe(pickSong('yue', 3));
  });
});
