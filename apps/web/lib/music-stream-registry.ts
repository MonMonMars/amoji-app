export type RegisteredStreamTrack = {
  id: string;
  ownerCode?: string;
  style: string;
  title: string;
  url: string;
  durationMs: number;
  license: string;
  credit: string;
  source: string;
};

let registered: readonly RegisteredStreamTrack[] | null = null;

export function registerPerformanceStreamTracks(tracks: readonly RegisteredStreamTrack[]): void {
  registered = tracks;
}

export function performanceStreamTracks(): readonly RegisteredStreamTrack[] {
  return registered ?? [];
}