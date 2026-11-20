// Owner dance / listen (MV stream) / sing body + song clip prefs (#432, r211).

import { curatedRailByClipId } from './idle-curated-rail';
import { isHonorableIdleClip } from './idle-owner-migrate';
import { listEnabledDanceClipIds, listEnabledSingClipIds } from './idle-enabled';
import { idlePickFor } from './idle-pick';
import { streamTrackById, tracksForStyle, type MusicStyleId, type StreamTrack } from './music-catalog';
import {
  mergeOwnerListenMvCodes,
  mergeOwnerSongClipIds,
  ownerIdleClipDeleted,
  ownerMvDeleted,
  ownerSongClipDeleted,
} from './owner-picker-decisions';
import { PERFORMANCE_CLIPS, type ClipQuery } from './performance-clips';
import {
  committedOwnerPerfSelection,
  OWNER_PERF_PICKS_KEY,
  OWNER_SHIP_LISTEN_MV_CODES,
  OWNER_SHIP_SONG_CLIP_IDS,
  type OwnerPerfPicksBlob,
} from './owner-perf-ship-set';

export { ownerDanceClipPrefs } from './owner-dance-picks';
export { OWNER_PERF_PICKS_KEY };

let memory: OwnerPerfPicksBlob | null = null;
let loaded = false;

function normMv(code: string): string {
  const t = code.trim().toUpperCase();
  if (/^MV\d+$/.test(t)) return t;
  const digits = t.replace(/\D/g, '');
  return digits ? `MV${digits.padStart(3, '0')}` : t;
}

function validMvCodes(codes: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of codes) {
    const c = normMv(raw);
    if (seen.has(c)) continue;
    if (ownerMvDeleted(c)) continue;
    if (!streamTrackById(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function validSongClipIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const clip = PERFORMANCE_CLIPS.find((c) => c.id === id && c.kind === 'song');
    if (!clip || seen.has(id) || ownerSongClipDeleted(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function shipDefaults(): OwnerPerfPicksBlob {
  return committedOwnerPerfSelection();
}

function parseBlob(raw: string): OwnerPerfPicksBlob {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return {};
    const o = v as Record<string, unknown>;
    const listenMvCodes = Array.isArray(o.listenMvCodes)
      ? o.listenMvCodes.filter((x): x is string => typeof x === 'string')
      : undefined;
    const songClipIds = Array.isArray(o.songClipIds)
      ? o.songClipIds.filter((x): x is string => typeof x === 'string')
      : undefined;
    const singBodyClipIds = Array.isArray(o.singBodyClipIds)
      ? o.singBodyClipIds.filter((x): x is string => typeof x === 'string')
      : undefined;
    return { listenMvCodes, songClipIds, singBodyClipIds };
  } catch {
    return {};
  }
}

function mergePrefs(local: OwnerPerfPicksBlob): OwnerPerfPicksBlob {
  const ship = shipDefaults();
  const listenRaw = local.listenMvCodes?.length ? local.listenMvCodes : ship.listenMvCodes ?? OWNER_SHIP_LISTEN_MV_CODES;
  const songRaw = local.songClipIds?.length ? local.songClipIds : ship.songClipIds ?? OWNER_SHIP_SONG_CLIP_IDS;
  const listen = validMvCodes(mergeOwnerListenMvCodes(listenRaw));
  const songs = validSongClipIds(mergeOwnerSongClipIds(songRaw));
  const singBody = (local.singBodyClipIds ?? []).filter(
    (id) =>
      isHonorableIdleClip(id) &&
      curatedRailByClipId(id)?.category === 'sing' &&
      !ownerIdleClipDeleted(id),
  );
  return {
    listenMvCodes: listen.length ? listen : validMvCodes(OWNER_SHIP_LISTEN_MV_CODES),
    songClipIds: songs.length ? songs : validSongClipIds(OWNER_SHIP_SONG_CLIP_IDS),
    singBodyClipIds: singBody.length ? singBody : undefined,
  };
}

function hydrate(): OwnerPerfPicksBlob {
  if (loaded && memory) return memory;
  loaded = true;
  let local: OwnerPerfPicksBlob = {};
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(OWNER_PERF_PICKS_KEY);
      if (raw != null) local = parseBlob(raw);
    }
  } catch { /* private mode */ }
  memory = mergePrefs(local);
  return memory;
}

export function forgetOwnerPerfPicksCache(): void {
  memory = null;
  loaded = false;
}

export function resetOwnerPerfPicks(): void {
  memory = mergePrefs({});
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(OWNER_PERF_PICKS_KEY);
  } catch { /* ignore */ }
}

/** Persist owner export from Pixel (merges with ship-set validation). */
export function saveOwnerPerfPicks(next: OwnerPerfPicksBlob): OwnerPerfPicksBlob {
  const merged = mergePrefs(next);
  memory = merged;
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        OWNER_PERF_PICKS_KEY,
        JSON.stringify({ ...next, savedAt: new Date().toISOString() }),
      );
    }
  } catch { /* private mode */ }
  return merged;
}

export function ownerListenMvCodes(): readonly string[] {
  return hydrate().listenMvCodes ?? [];
}

export function ownerSongClipIds(): readonly string[] {
  return hydrate().songClipIds ?? [];
}

/** Ordered owner sing VRMA: character pin (sing) → enabled sing rails → ship sing body list. */
export function ownerSingClipPrefs(characterId?: string | null): string[] {
  const prefs = hydrate();
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!isHonorableIdleClip(id) || seen.has(id) || ownerIdleClipDeleted(id)) return;
    seen.add(id);
    out.push(id);
  };
  if (characterId) {
    const pin = idlePickFor(characterId);
    if (pin && curatedRailByClipId(pin)?.category === 'sing') push(pin);
  }
  for (const id of listEnabledSingClipIds()) push(id);
  for (const id of prefs.singBodyClipIds ?? []) push(id);
  return out;
}

function styleMatchesTrack(style: MusicStyleId | undefined, track: StreamTrack): boolean {
  if (!style || style === 'default') return true;
  return track.style === style;
}

/**
 * Prefer owner-pinned MV stream beds over weighted random rotation.
 * Returns null when no owner pin matches (caller uses pickStreamTrack).
 */
export function pickOwnerStreamTrack(
  style: MusicStyleId | undefined,
  n = 0,
): StreamTrack | null {
  const codes = ownerListenMvCodes();
  if (!codes.length) return null;
  const tracks: StreamTrack[] = [];
  const seen = new Set<string>();
  for (const code of codes) {
    const t = streamTrackById(code);
    if (!t || seen.has(t.id)) continue;
    if (!styleMatchesTrack(style, t)) continue;
    seen.add(t.id);
    tracks.push(t);
  }
  if (!tracks.length) return null;
  const idx = Math.abs(n) % tracks.length;
  return tracks[idx] ?? null;
}

/** All owner listen tracks (for select UI ordering). */
export function ownerListenStreamPool(style?: MusicStyleId): StreamTrack[] {
  const codes = ownerListenMvCodes();
  const out: StreamTrack[] = [];
  const seen = new Set<string>();
  for (const code of codes) {
    const t = streamTrackById(code);
    if (!t || seen.has(t.id)) continue;
    if (style && !styleMatchesTrack(style, t)) continue;
    seen.add(t.id);
    out.push(t);
  }
  if (!out.length && style) {
    const styled = tracksForStyle(style).filter((t) =>
      codes.some((c) => streamTrackById(c)?.id === t.id),
    );
    if (styled.length) return styled;
  }
  return out;
}

function songMatchesQuery(clipId: string, q: ClipQuery): boolean {
  const clip = PERFORMANCE_CLIPS.find((c) => c.id === clipId);
  if (!clip || clip.kind !== 'song') return false;
  if (q.bed && !clip.file.includes('/song-bed/')) return false;
  if (q.bed === false && clip.file.includes('/song-bed/')) return false;
  if (q.gender === 'female' || q.gender === 'male') {
    if (clip.voice && clip.voice !== q.gender) return false;
  }
  const styleNeedle = (q.style ?? '').toLowerCase().trim();
  if (styleNeedle && !clip.style.toLowerCase().includes(styleNeedle)) {
    const soft =
      (styleNeedle === 'chill' && /chill|soft|ballad|lofi/i.test(clip.style)) ||
      (styleNeedle === 'ballad' && /ballad|soft|chill/i.test(clip.style)) ||
      (styleNeedle === 'pop' && /pop|cheer|cute/i.test(clip.style));
    if (!soft) return false;
  }
  return true;
}

/** First owner-pinned song clip matching the query, or pinned rotation by n. */
export function pickOwnerSongClipId(q: ClipQuery): string | null {
  if (q.kind !== 'song') return null;
  if (q.clipId) return q.clipId;
  const ids = ownerSongClipIds();
  if (!ids.length) return null;
  const matches = ids.filter((id) => songMatchesQuery(id, q));
  const pool = matches.length ? matches : ids.filter((id) => songMatchesQuery(id, { ...q, style: undefined }));
  if (!pool.length) return null;
  const n = Math.abs(q.n ?? 0);
  return pool[n % pool.length] ?? null;
}