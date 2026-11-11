import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  listMusicPickOptions,
  musicAskShowKind,
  musicSelectOfferLine,
  resolveMusicAsk,
} from '../lib/music-ask';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('resolveMusicAsk intent routing', () => {
  it('generic music / sing / dance asks → random (no picker)', () => {
    expect(resolveMusicAsk('play some music')).toEqual({
      mode: 'random',
      kind: 'music',
      style: undefined,
      matched: true,
    });
    expect(resolveMusicAsk('put on a song')).toMatchObject({ mode: 'random', kind: 'music', matched: true });
    expect(resolveMusicAsk('播音樂')).toMatchObject({ mode: 'random', kind: 'music', matched: true });
    expect(resolveMusicAsk('sing a song')).toMatchObject({ mode: 'random', kind: 'song', matched: true });
    expect(resolveMusicAsk('唱首歌俾我聽')).toMatchObject({ mode: 'random', kind: 'song', matched: true });
    expect(resolveMusicAsk('dance for me')).toMatchObject({ mode: 'random', kind: 'dance', matched: true });
  });

  it('explicit select / list / what-songs → select mode', () => {
    expect(resolveMusicAsk('let me choose a song')).toMatchObject({
      mode: 'select',
      kind: 'song',
      matched: true,
    });
    expect(resolveMusicAsk('what songs do you have?')).toMatchObject({
      mode: 'select',
      matched: true,
    });
    expect(resolveMusicAsk('list songs')).toMatchObject({ mode: 'select', matched: true });
    expect(resolveMusicAsk('show me the playlist')).toMatchObject({ mode: 'select', matched: true });
    expect(resolveMusicAsk('有咩歌')).toMatchObject({ mode: 'select', matched: true });
    expect(resolveMusicAsk('讓我選一首')).toMatchObject({ mode: 'select', matched: true });
    expect(resolveMusicAsk('曲を選んで')).toMatchObject({ mode: 'select', matched: true });
  });

  it('genre play without choose → random + style filter', () => {
    expect(resolveMusicAsk('play jazz')).toEqual({
      mode: 'random',
      kind: 'music',
      style: 'jazz',
      matched: true,
    });
    expect(resolveMusicAsk('play something lofi')).toMatchObject({
      mode: 'random',
      style: 'lofi',
      matched: true,
    });
    expect(resolveMusicAsk('play something calm')).toMatchObject({
      mode: 'random',
      style: 'chill',
      matched: true,
    });
    expect(resolveMusicAsk('來首粵語歌')).toMatchObject({
      mode: 'random',
      style: 'cantopop',
      matched: true,
    });
  });

  it('genre + choose / list → select with style filter', () => {
    expect(resolveMusicAsk('let me pick a jazz song')).toMatchObject({
      mode: 'select',
      style: 'jazz',
      matched: true,
    });
    expect(resolveMusicAsk('what lofi tracks do you have')).toMatchObject({
      mode: 'select',
      style: 'lofi',
      matched: true,
    });
  });

  it('non-music lines → none (no picker forced)', () => {
    expect(resolveMusicAsk('hello')).toEqual({
      mode: 'none',
      kind: 'music',
      style: undefined,
      matched: false,
    });
    expect(resolveMusicAsk("what's the weather")).toMatchObject({ mode: 'none', matched: false });
    expect(resolveMusicAsk('jazz')).toMatchObject({ mode: 'none', matched: false });
  });
});

describe('listMusicPickOptions + offer line', () => {
  it('offers 2–3 named stream tracks for music select (varied genres)', () => {
    const opts = listMusicPickOptions({ kind: 'music', seed: 3, count: 3 });
    expect(opts.length).toBe(3);
    expect(new Set(opts.map((o) => o.genre)).size).toBeGreaterThanOrEqual(2);
    for (const o of opts) {
      expect(o.source).toBe('stream');
      expect(o.streamId).toBeTruthy();
      expect(o.title.length).toBeGreaterThan(0);
      expect(o.kind).toBe('dance');
    }
  });

  it('filters stream options by genre when style is set', () => {
    const jazz = listMusicPickOptions({ kind: 'music', style: 'jazz', seed: 0, count: 3 });
    expect(jazz.length).toBeGreaterThanOrEqual(1);
    expect(jazz.every((o) => o.genre === 'jazz' || o.styleHint === 'jazz')).toBe(true);
  });

  it('song select uses local vocal clips', () => {
    const songs = listMusicPickOptions({ kind: 'song', gender: 'female', seed: 1, count: 3 });
    expect(songs.length).toBe(3);
    expect(songs.every((o) => o.source === 'clip' && o.kind === 'song' && o.clipId)).toBe(true);
  });

  it('musicSelectOfferLine names titles and genres', () => {
    const opts = listMusicPickOptions({ kind: 'music', seed: 0, count: 3 });
    const line = musicSelectOfferLine('en', opts);
    expect(line).toMatch(/pick one/i);
    for (const o of opts) {
      expect(line).toContain(o.title);
      expect(line).toContain(o.genre);
    }
    expect(musicSelectOfferLine('yue', opts)).toContain('你揀');
    expect(musicAskShowKind('song')).toBe('song');
    expect(musicAskShowKind('music')).toBe('dance');
  });
});

describe('ChatPanel gates picker behind select intent', () => {
  it('wires resolveMusicAsk and only shows music pick chips from select path', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('resolveMusicAsk');
    expect(panel).toContain('listMusicPickOptions');
    expect(panel).toContain('musicSelectOfferLine');
    expect(panel).toContain('musicPicks');
    expect(panel).toContain("ask.mode === 'select'");
    expect(panel).toContain("ask.mode === 'random'");
    const demo = fs.readFileSync(path.join(ROOT, 'lib/demo-phase.ts'), 'utf8');
    expect(demo).toContain("'play some music'");
  });
});
