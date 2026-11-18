// Pixel ship-set defaults for listen / sing audio when no owner export or localStorage.

import { PREFERRED_DEMO_CLIPS } from './performance-clips';
import shipJson from '../data/owner-perf-selection.json';

export const OWNER_PERF_PICKS_KEY = 'amoji.ownerPerfPicks.v1' as const;

export interface OwnerPerfPicksBlob {
  listenMvCodes?: string[];
  songClipIds?: string[];
  /** Optional explicit sing VRMA shortlist (else idle sing rails + pin). */
  singBodyClipIds?: string[];
  savedAt?: string;
}

const demoSongs = [
  'sing-f-twinkle',
  'sing-f-silent-night',
  'sing-f-joy',
  'sing-m-happy-birthday',
  'sing-m-shenandoah',
  'bed-lullaby',
].filter((id) => PREFERRED_DEMO_CLIPS.has(id));

/** Fallback listen beds (JP + US vault highlights). */
export const OWNER_SHIP_LISTEN_MV_CODES: readonly string[] =
  shipJson.listenMvCodes?.length ? shipJson.listenMvCodes : ['MV069', 'MV079', 'MV084'];

/** Fallback sung CC0 clips (classic demos). */
export const OWNER_SHIP_SONG_CLIP_IDS: readonly string[] =
  shipJson.songClipIds?.length ? shipJson.songClipIds : demoSongs;

export function committedOwnerPerfSelection(): OwnerPerfPicksBlob {
  return {
    listenMvCodes: [...OWNER_SHIP_LISTEN_MV_CODES],
    songClipIds: [...OWNER_SHIP_SONG_CLIP_IDS],
  };
}