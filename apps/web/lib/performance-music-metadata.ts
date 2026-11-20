import metaJson from '../data/performance-music-metadata.json';
import { PERFORMANCE_CLIPS } from './performance-clips';
import { streamTrackInCatalog } from './performance-music-allowlist';

export interface PerformanceMusicMeta {
  id: string;
  title: string;
  artist: string;
  genre: string;
  moods: string[];
  story: string;
  durationSec: number;
  license: string;
  sourceUrl: string;
  ownerCode?: string;
  style?: string;
}

type Row = {
  title: string;
  artist: string;
  genre: string;
  moods: string[];
  story: string;
  license: string;
  sourceUrl: string;
};

const EXTRA = metaJson.tracks as Record<string, Row>;

export function musicMetadataForTrack(id: string | undefined | null): PerformanceMusicMeta | null {
  if (!id?.trim()) return null;
  const needle = id.trim();
  const clip = PERFORMANCE_CLIPS.find((c) => c.id === needle);
  if (clip) {
    const extra = EXTRA[clip.id];
    return {
      id: clip.id,
      title: extra?.title ?? clip.labels.en,
      artist: extra?.artist ?? clip.credit,
      genre: extra?.genre ?? clip.style,
      moods: extra?.moods ?? clip.moods,
      story: extra?.story ?? `CC0 performance clip (${clip.credit}).`,
      durationSec: Math.round(clip.durationMs / 1000),
      license: clip.license,
      sourceUrl: extra?.sourceUrl ?? clip.source,
      style: clip.style,
    };
  }
  const stream = streamTrackInCatalog(needle);
  if (stream) {
    const key = stream.ownerCode ?? stream.id;
    const extra = EXTRA[key];
    return {
      id: stream.id,
      title: extra?.title ?? stream.title,
      artist: extra?.artist ?? stream.credit,
      genre: extra?.genre ?? stream.style,
      moods: extra?.moods ?? [stream.style],
      story: extra?.story ?? `Owner performance library stream (${stream.license}).`,
      durationSec: Math.round(stream.durationMs / 1000),
      license: stream.license,
      sourceUrl: extra?.sourceUrl ?? stream.source,
      ownerCode: stream.ownerCode,
      style: stream.style,
    };
  }
  const extra = EXTRA[needle];
  return extra
    ? {
        id: needle,
        title: extra.title,
        artist: extra.artist,
        genre: extra.genre,
        moods: extra.moods,
        story: extra.story,
        durationSec: 0,
        license: extra.license,
        sourceUrl: extra.sourceUrl,
      }
    : null;
}