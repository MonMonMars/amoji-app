import { describe, expect, it } from 'vitest';
import {
  detectMusicStyle,
  pickStreamTrack,
  resolveStreamPlaylist,
  STREAM_TRACKS,
  STYLE_THEME_ID,
} from '../lib/music-catalog';

describe('royalty-free music catalog', () => {
  it('detects common style words across languages', () => {
    expect(detectMusicStyle('play some jazz')).toBe('jazz');
    expect(detectMusicStyle('來首粵語歌')).toBe('cantopop');
    expect(detectMusicStyle('lofi beats please')).toBe('lofi');
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
  });
});
