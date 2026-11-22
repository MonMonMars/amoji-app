import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  listMusicPickOptions,
  musicAskListenOnly,
  musicAskShowKind,
  musicAskStyleWithContext,
  musicSelectOfferLine,
  resolveMusicAsk,
} from '../lib/music-ask';
import { pickOwnerStreamTrack, resetOwnerPerfPicks } from '../lib/owner-perf-picks';
import { detectMusicStyle, pickStreamTrack } from '../lib/music-catalog';

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


  it('yue hip-hop availability + play challenge (regression transcript)', () => {
    expect(resolveMusicAsk('有冇hip hop音樂')).toEqual({
      mode: 'random',
      kind: 'music',
      style: 'hiphop',
      matched: true,
    });
    expect(resolveMusicAsk('你唔係可以播音樂㗎咩')).toMatchObject({
      mode: 'random',
      kind: 'music',
      matched: true,
    });
    expect(musicAskStyleWithContext('你唔係可以播音樂㗎咩', '有冇hip hop音樂')).toBe('hiphop');
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


  it('hiphop stream pick ignores unrelated owner MV pins', () => {
    resetOwnerPerfPicks();
    expect(detectMusicStyle('有冇hip hop音樂')).toBe('hiphop');
    expect(pickOwnerStreamTrack('hiphop', 0)).toBeNull();
    expect(pickStreamTrack('hiphop', 0)).toBeNull();
  });

  it('filters stream options by genre when style is set', () => {
    const jpop = listMusicPickOptions({ kind: 'music', style: 'jpop', seed: 0, count: 3 });
    expect(jpop.length).toBeGreaterThanOrEqual(1);
    expect(jpop.every((o) => o.genre === 'jpop' || o.styleHint === 'jpop')).toBe(true);
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
    // Owner 2026-11-23: every audible bed arms motion by default.
    expect(musicAskListenOnly('music')).toBe(false);
    expect(musicAskListenOnly('dance')).toBe(false);
    expect(musicAskListenOnly('song')).toBe(false);
    // The calm listen-only idle survives, but only when asked for explicitly.
    expect(musicAskListenOnly('music', { listenOnly: true })).toBe(true);
    expect(musicAskListenOnly('song', { listenOnly: true })).toBe(true);
  });

  it('explicit "just listen" keeps the no-dance option reachable', () => {
    for (const line of [
      'just listen to some music',
      'play music, no dancing',
      'just listen to a song, listen only',
      '唔好跳，淨係聽歌',
      '只想聽，不要跳舞',
    ]) {
      const ask = resolveMusicAsk(line);
      expect(ask.matched).toBe(true);
      expect(ask.listenOnly).toBe(true);
      expect(musicAskListenOnly(ask.kind, ask)).toBe(true);
    }
    // A plain dance ask is still a dance ask.
    expect(resolveMusicAsk('dance for me').listenOnly).toBeFalsy();
    expect(resolveMusicAsk('跳舞').listenOnly).toBeFalsy();
    expect(resolveMusicAsk('play some music').listenOnly).toBeFalsy();
  });

  it('listen-song asks resolve to a performed vocal bed (not calm idle)', () => {
    expect(resolveMusicAsk('listen to a song')).toMatchObject({
      mode: 'random',
      kind: 'song',
      matched: true,
    });
    expect(resolveMusicAsk('聽首歌')).toMatchObject({
      kind: 'song',
      matched: true,
    });
    expect(resolveMusicAsk('聽首歌').listenOnly).toBeFalsy();
    expect(resolveMusicAsk('唱首歌俾我聽')).toMatchObject({
      kind: 'song',
      matched: true,
    });
    expect(resolveMusicAsk('唱首歌俾我聽').listenOnly).toBeFalsy();
  });

  it('music pick streams are not listen-only anymore', () => {
    const opts = listMusicPickOptions({ kind: 'music', seed: 1, count: 3 });
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(o.listenOnly).toBeFalsy();
    }
    const danceOpts = listMusicPickOptions({ kind: 'dance', seed: 1, count: 3 });
    for (const o of danceOpts) {
      expect(o.listenOnly).toBeFalsy();
    }
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
    expect(panel).toContain('musicAskStyleWithContext');
    expect(panel).toMatch(/!musicPicks\?\.length/);
    const demo = fs.readFileSync(path.join(ROOT, 'lib/demo-phase.ts'), 'utf8');
    expect(demo).toContain("'play some music'");
  });

  it('random sing / dance short-circuit like music — no LLM ditty stack', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    // 唱首歌 must beginShow + done without falling through to pickSong / LLM.
    expect(panel).toMatch(/ask\.kind === 'music' \|\| ask\.kind === 'song' \|\| ask\.kind === 'dance'/);
    expect(panel).toContain('musicAskShowKind');
    expect(panel).toContain('musicAskListenOnly');
    // speakReply sing must not paste bank lyrics under the clip title.
    expect(panel).toMatch(/if \(mv === 'sing'\)/);
    expect(panel).not.toContain('pickSong');
  });
});
