import { isPlayableMvCode } from './music-allowlist-config';
import { performanceStreamTracks } from './music-stream-registry';
import type { MusicStyleId, StreamTrack } from './music-catalog';

export {
  allApprovedPlayableIds,
  approvedDanceClipIds,
  approvedListenMvCodes,
  approvedSongClipIds,
  committedMusicAllowlist,
  isPlayablePerformanceClip,
  setOwnerPickerNotesExport,
  type MusicAllowlistConfig,
} from './music-allowlist-config';

function catalog(): readonly StreamTrack[] {
  return performanceStreamTracks() as readonly StreamTrack[];
}

export function streamTrackInCatalog(id: string | undefined | null): StreamTrack | null {
  if (!id) return null;
  const needle = id.trim();
  const upper = needle.toUpperCase();
  return catalog().find((t) => t.id === needle || t.ownerCode === upper) ?? null;
}

export function isPlayableStreamTrack(track: StreamTrack): boolean {
  if (!track.ownerCode) return false;
  return isPlayableMvCode(track.ownerCode);
}

export function filterPlayableStreamTracks(tracks: readonly StreamTrack[]): StreamTrack[] {
  return tracks.filter(isPlayableStreamTrack);
}

export function playableStreamTrackById(id: string | undefined | null): StreamTrack | null {
  const t = streamTrackInCatalog(id);
  return t && isPlayableStreamTrack(t) ? t : null;
}

export const streamTrackById = playableStreamTrackById;

export function playableTracksForStyle(style: MusicStyleId): StreamTrack[] {
  const playable = filterPlayableStreamTracks(catalog());
  if (style === 'default') return playable;
  const hits = playable.filter((t) => t.style === style);
  return hits.length ? hits : playable.filter((t) => t.style === 'pop' || t.style === 'dance');
}