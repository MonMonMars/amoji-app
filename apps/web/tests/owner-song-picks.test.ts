import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PERFORMANCE_CLIPS } from '../lib/performance-clips';
import { committedMusicAllowlist, isPlayablePerformanceClip } from '../lib/music-allowlist-config';
import { committedOwnerPerfSelection, OWNER_SHIP_SONG_CLIP_IDS } from '../lib/owner-perf-ship-set';
import { committedOwnerPickerSelection } from '../lib/owner-picker-ship-set';
import { forgetOwnerPerfPicksCache, ownerSongClipIds } from '../lib/owner-perf-picks';

/**
 * The owner (Pixel) reviewed all 77 DC performance-clip rows in
 * `owner-picker-notes-2026-11-18.json` and marked exactly these sung clips 採用.
 * Pin them by id AND title so a future refactor cannot silently drop the
 * owner's curated singing set again.
 */
const OWNER_SONG_PICKS = [
  { id: 'sing-m-happy-birthday', title: 'Happy Birthday', voice: 'male' },
  { id: 'sing-m-shenandoah', title: 'Shenandoah', voice: 'male' },
  { id: 'sing-f-soave-long', title: 'Soave (long)', voice: 'female' },
] as const;

/** Rows the same export marked 刪除 — they must never come back as ship-songs. */
const OWNER_DELETED_SONGS = [
  'sing-f-twinkle',
  'sing-f-silent-night',
  'sing-f-joy',
  'sing-f-adele',
  'sing-f-soave',
  'bed-lullaby',
] as const;

afterEach(() => {
  forgetOwnerPerfPicksCache();
});

describe('owner singing picks (owner-picker-notes-2026-11-18)', () => {
  it('ships exactly the owner 採用 sung clips in the music allowlist', () => {
    expect(committedMusicAllowlist().songClipIds).toEqual(OWNER_SONG_PICKS.map((p) => p.id));
  });

  it('pins the same picks as the repo ship-set', () => {
    expect(committedOwnerPerfSelection().songClipIds).toEqual(OWNER_SONG_PICKS.map((p) => p.id));
    expect(OWNER_SHIP_SONG_CLIP_IDS).toEqual(OWNER_SONG_PICKS.map((p) => p.id));
    expect(ownerSongClipIds()).toEqual(OWNER_SONG_PICKS.map((p) => p.id));
  });

  it('resolves each pick to a sung clip with matching title/voice and audio on disk', () => {
    for (const pick of OWNER_SONG_PICKS) {
      const clip = PERFORMANCE_CLIPS.find((c) => c.id === pick.id);
      expect(clip, pick.id).toBeTruthy();
      expect(clip!.kind, pick.id).toBe('song');
      expect(clip!.voice, pick.id).toBe(pick.voice);
      expect(clip!.labels.en, pick.id).toBe(pick.title);
      const file = path.join(__dirname, '..', 'public', clip!.file.replace(/^\//, ''));
      expect(fs.existsSync(file), file).toBe(true);
      expect(isPlayablePerformanceClip(pick.id, 'song'), pick.id).toBe(true);
    }
  });

  it('keeps the owner 刪除 songs out of the playable set', () => {
    for (const id of OWNER_DELETED_SONGS) {
      expect(committedMusicAllowlist().songClipIds, id).not.toContain(id);
      expect(isPlayablePerformanceClip(id), id).toBe(false);
    }
  });

  it('records the owner DC tri-state so a later edit cannot re-add deleted picks', () => {
    const ship = committedOwnerPickerSelection();
    expect(ship.use).toEqual(expect.arrayContaining(['DC018', 'DC057', 'DC069']));
    expect(ship.delete).toEqual(
      expect.arrayContaining(['DC014', 'DC015', 'DC016', 'DC010', 'DC053', 'DC054', 'DC056']),
    );
    for (const pick of OWNER_SONG_PICKS) expect(ship.use).not.toContain(pick.id);
  });
});
