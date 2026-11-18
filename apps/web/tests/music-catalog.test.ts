import { describe, expect, it } from 'vitest';
import {
  detectMusicStyle,
  pickStreamTrack,
  resolveStreamPlaylist,
  streamTrackById,
  STREAM_TRACKS,
  STYLE_THEME_ID,
} from '../lib/music-catalog';
import {
  JPOP_VAULT_STREAM_TRACKS,
  MV_JPOP_COUNT,
  MV_JPOP_FIRST,
  MV_JPOP_LAST,
} from '../lib/music-jpop-vault';
import { JPOP_VAULT_V2_STREAM_TRACKS, MV_JPOP_V2_COUNT, MV_JPOP_V2_FIRST, MV_JPOP_V2_LAST } from '../lib/music-jpop-vault-v2';
import { MV_USPOP_COUNT, MV_USPOP_FIRST, MV_USPOP_LAST, USPOP_VAULT_STREAM_TRACKS } from '../lib/music-us-pop-vault';
import { HIGHEST_MV_OWNER_CODE, MV_VAULT_COUNT, MV_VAULT_LAST } from '../lib/music-mv-registry';

describe('royalty-free music catalog', () => {
  it('detects common style words across languages', () => {
    expect(detectMusicStyle('play some jazz')).toBe('jazz');
    expect(detectMusicStyle('J-pop bed please')).toBe('jpop');
    expect(detectMusicStyle('シティポップ')).toBe('jpop');
    expect(detectMusicStyle('American pop please')).toBe('uspop');
    expect(detectMusicStyle('美國流行音樂')).toBe('uspop');
    expect(detectMusicStyle('來首粵語歌')).toBe('cantopop');
    expect(detectMusicStyle('lofi beats please')).toBe('lofi');
    expect(detectMusicStyle('play something calm')).toBe('chill');
    expect(detectMusicStyle('電子音樂')).toBe('electronic');
    expect(detectMusicStyle('hello')).toBeUndefined();
  });

  it('ships only Mixkit-free or PD stream URLs (no Spotify/YouTube scrape)', () => {
    expect(STREAM_TRACKS.length).toBeGreaterThanOrEqual(10);
    for (const t of STREAM_TRACKS) {
      expect(t.url).toMatch(/^https:\/\//);
      expect(t.url).not.toMatch(/spotify|youtube|youtu\.be|apple\.com\/music|netease/i);
      expect(['Mixkit-Free', 'CC0-1.0', 'PD']).toContain(t.license);
      expect(t.credit.length).toBeGreaterThan(0);
    }
  });

  it('resolveStreamPlaylist returns a catalog URL for a named style', () => {
    expect(resolveStreamPlaylist()).toBeNull();
    const jazz = resolveStreamPlaylist('jazz');
    expect(jazz).toMatch(/^https:\/\/assets\.mixkit\.co\//);
    expect(pickStreamTrack('pop', 0)?.style).toBe('pop');
    expect(pickStreamTrack('uspop', 0)?.style).toBe('uspop');
    expect(STYLE_THEME_ID.jazz).toBeTruthy();
    const jpop = resolveStreamPlaylist('jpop');
    expect(jpop).toMatch(/^https:\/\/assets\.mixkit\.co\//);
    const us = resolveStreamPlaylist('uspop');
    expect(us).toMatch(/^https:\/\/assets\.mixkit\.co\//);
  });

  it('ships MV039–MV098 JP + US pop vault rows with Mixkit license', () => {
    expect(JPOP_VAULT_STREAM_TRACKS.length).toBe(MV_JPOP_COUNT);
    expect(MV_JPOP_FIRST).toBe(39);
    expect(MV_JPOP_LAST).toBe(68);
    expect(JPOP_VAULT_V2_STREAM_TRACKS.length).toBe(MV_JPOP_V2_COUNT);
    expect(MV_JPOP_V2_FIRST).toBe(69);
    expect(MV_JPOP_V2_LAST).toBe(83);
    expect(USPOP_VAULT_STREAM_TRACKS.length).toBe(MV_USPOP_COUNT);
    expect(MV_USPOP_FIRST).toBe(84);
    expect(MV_USPOP_LAST).toBe(98);
    expect(MV_VAULT_COUNT).toBe(60);
    expect(MV_VAULT_LAST).toBe(98);
    expect(HIGHEST_MV_OWNER_CODE).toBe('MV098');

    const codes = new Set(
      [...JPOP_VAULT_STREAM_TRACKS, ...JPOP_VAULT_V2_STREAM_TRACKS, ...USPOP_VAULT_STREAM_TRACKS].map(
        (t) => t.ownerCode,
      ),
    );
    expect(codes.size).toBe(MV_VAULT_COUNT);
    for (let n = 39; n <= 98; n++) {
      expect(codes.has(`MV${String(n).padStart(3, '0')}`)).toBe(true);
    }

    for (const t of JPOP_VAULT_STREAM_TRACKS) {
      expect(t.style).toBe('jpop');
    }
    for (const t of JPOP_VAULT_V2_STREAM_TRACKS) {
      expect(t.style).toBe('jpop');
    }
    for (const t of USPOP_VAULT_STREAM_TRACKS) {
      expect(t.style).toBe('uspop');
    }

    for (const t of [...JPOP_VAULT_STREAM_TRACKS, ...JPOP_VAULT_V2_STREAM_TRACKS, ...USPOP_VAULT_STREAM_TRACKS]) {
      expect(t.license).toBe('Mixkit-Free');
      expect(t.url).toMatch(/^https:\/\/assets\.mixkit\.co\/music\/preview\/mixkit-/);
    }

    expect(STREAM_TRACKS.length).toBeGreaterThanOrEqual(18 + MV_VAULT_COUNT);
    expect(streamTrackById('MV069')?.style).toBe('jpop');
    expect(streamTrackById('MV084')?.style).toBe('uspop');
    expect(streamTrackById('mv098')?.ownerCode).toBe('MV098');
  });
});