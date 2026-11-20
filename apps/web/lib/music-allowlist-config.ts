import allowlistJson from '../data/owner-music-allowlist.json';
import shipJson from '../data/owner-perf-selection.json';
import { parseOwnerPickerNotesForMusic, type OwnerPickerNotesExport } from './owner-picker-notes';

export interface MusicAllowlistConfig {
  listenMvCodes: readonly string[];
  songClipIds: readonly string[];
  danceClipIds: readonly string[];
  deletedMvCodes: readonly string[];
  deletedClipIds: readonly string[];
}

let notesOverride: OwnerPickerNotesExport | null = null;

export function setOwnerPickerNotesExport(exp: OwnerPickerNotesExport | null): void {
  notesOverride = exp;
}

function normMv(raw: string): string {
  const t = raw.trim().toUpperCase();
  return /^MV\d+$/.test(t) ? t : `MV${t.replace(/\D/g, '').padStart(3, '0')}`;
}

function uniq(list: readonly string[]): string[] {
  return [...new Set(list.map((x) => x.trim()).filter(Boolean))];
}

export function committedMusicAllowlist(): MusicAllowlistConfig {
  const baseMv = allowlistJson.listenMvCodes?.length ? allowlistJson.listenMvCodes : shipJson.listenMvCodes ?? [];
  const baseSongs = allowlistJson.songClipIds?.length ? allowlistJson.songClipIds : shipJson.songClipIds ?? [];
  const baseDance = allowlistJson.danceClipIds ?? [];
  const parsed = parseOwnerPickerNotesForMusic(notesOverride ?? undefined);
  const mvDel = new Set([...(allowlistJson.deletedMvCodes ?? []), ...(parsed?.deletedMvCodes ?? [])].map(normMv));
  const clipDel = new Set([...(allowlistJson.deletedClipIds ?? []), ...(parsed?.deletedClipIds ?? [])]);
  return {
    listenMvCodes: uniq([...baseMv, ...(parsed?.listenMvCodes ?? [])]).filter((c) => !mvDel.has(normMv(c))),
    songClipIds: uniq([...baseSongs, ...(parsed?.songClipIds ?? [])]).filter((id) => !clipDel.has(id)),
    danceClipIds: uniq([...baseDance, ...(parsed?.danceClipIds ?? [])]).filter((id) => !clipDel.has(id)),
    deletedMvCodes: [...mvDel],
    deletedClipIds: [...clipDel],
  };
}

export const approvedListenMvCodes = () => committedMusicAllowlist().listenMvCodes;
export const approvedSongClipIds = () => committedMusicAllowlist().songClipIds;
export const approvedDanceClipIds = () => committedMusicAllowlist().danceClipIds;
export const allApprovedPlayableIds = () => {
  const c = committedMusicAllowlist();
  return [...c.listenMvCodes, ...c.songClipIds, ...c.danceClipIds];
};

export function isPlayableMvCode(code: string): boolean {
  return new Set(committedMusicAllowlist().listenMvCodes.map(normMv)).has(normMv(code));
}

export function isPlayablePerformanceClip(clipId: string, kind?: 'song' | 'dance'): boolean {
  const c = committedMusicAllowlist();
  if (kind === 'song') return c.songClipIds.includes(clipId);
  if (kind === 'dance') return c.danceClipIds.includes(clipId);
  return c.songClipIds.includes(clipId) || c.danceClipIds.includes(clipId);
}