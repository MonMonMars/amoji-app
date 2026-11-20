import { describe, expect, it } from 'vitest';
import {
  allApprovedPlayableIds,
  committedMusicAllowlist,
  isPlayablePerformanceClip,
  setOwnerPickerNotesExport,
} from '../lib/music-allowlist-config';
import {
  isPlayableStreamTrack,
  streamTrackById,
  streamTrackInCatalog,
} from '../lib/performance-music-allowlist';
import { musicMetadataForTrack } from '../lib/performance-music-metadata';
import { tracksForStyle } from '../lib/music-catalog';
import { parseOwnerPickerNotesJson } from '../lib/owner-picker-notes';

describe('performance music allowlist', () => {
  it('ships only owner MV pins', () => {
    const allow = committedMusicAllowlist();
    expect(allow.listenMvCodes).toHaveLength(4);
    expect(streamTrackById('MV098')).toBeNull();
    expect(tracksForStyle('jpop').length).toBeGreaterThan(0);
  });

  it('honors 刪除 from owner-picker-notes-v2', () => {
    setOwnerPickerNotesExport(
      parseOwnerPickerNotesJson(
        JSON.stringify({
          version: 'owner-picker-notes-v2',
          items: [{ id: 'MV069', domainCode: 'MV069', decision: 'delete' }],
        }),
      ),
    );
    expect(streamTrackById('MV069')).toBeNull();
    expect(isPlayablePerformanceClip('bed-lay-low', 'dance')).toBe(true);
    setOwnerPickerNotesExport(null);
  });

  it('exposes TTS metadata', () => {
    expect(allApprovedPlayableIds()).toContain('bed-adventure-time');
    const meta = musicMetadataForTrack('bed-synthwave-city');
    expect(meta?.durationSec).toBeGreaterThan(120);
    const mv = streamTrackInCatalog('MV069');
    expect(mv && isPlayableStreamTrack(mv)).toBe(true);
  });
});