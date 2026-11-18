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
  HIGHEST_MV_OWNER_CODE,
  JPOP_VAULT_STREAM_TRACKS,
  MV_JPOP_COUNT,
  MV_JPOP_FIRST,
  MV_JPOP_LAST,
} from '../lib/music-jpop-vault';

describe('royalty-free music catalog', () => {
  it('detects common style words across languages', () => {
    expect(detectMusicStyle('play some jazz')).toBe('jazz');
    expect(detectMusicStyle('J-pop bed please')).toBe('jpop');
    expect(detectMusicStyle('シティポップ')).toBe('jpop');
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
    expect(STYLE_THEME_ID.jazz).toBeTruthy();
    const jpop = resolveStreamPlaylist('jpop');
    expect(jpop).toMatch(/^https:\/\/assets\.mixkit\.co\//);
  });

  it('ships MV039–MV068 J-pop vault rows with Mixkit license', () => {
    expect(JPOP_VAULT_STREAM_TRACKS.length).toBe(MV_JPOP_COUNT);
    expect(MV_JPOP_FIRST).toBe(39);
    expect(MV_JPOP_LAST).toBe(68);
    expect(HIGHEST_MV_OWNER_CODE).toBe('MV068');
    const codes = new Set(JPOP_VAULT_STREAM_TRACKS.map((t) => t.ownerCode));
    expect(codes.size).toBe(MV_JPOP_COUNT);
    for (let n = MV_JPOP_FIRST; n <= MV_JPOP_LAST; n++) {
      expect(codes.has(`MV${String(n).padStart(3, '0')}`)).toBe(true);
    }
    for (const t of JPOP_VAULT_STREAM_TRACKS) {
      expect(t.style).toBe('jpop');
      expect(t.license).toBe('Mixkit-Free');
      expect(t.url).toMatch(/^https:\/\/assets\.mixkit\.co\/music\/preview\/mixkit-/);
    }
    expect(STREAM_TRACKS.length).toBeGreaterThanOrEqual(18 + MV_JPOP_COUNT);
    expect(streamTrackById('MV045')?.title).toBeTruthy();
    expect(streamTrackById('mv045')?.ownerCode).toBe('MV045');
  });
});
