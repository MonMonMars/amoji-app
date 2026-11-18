/**
 * Idle v2 default (r221): always-visible upper-body VRMA on chat — curated-rail
 * rotation within one author family, owner pin wins, perf / content pins unchanged.
 */

import { ownerCalmIdleClip } from './chat-auto-idle';
import { idleClipById } from './idle-clips';
import { curatedRailByClipId } from './idle-curated-rail';
import { listEnabledIdleClipIds } from './idle-enabled';
import { idleCrossfadeCompatible, idleClipFamily } from './idle-clip-family';
import { isHonorableIdleClip } from './idle-owner-migrate';
import { orderPassiveIdleClips } from './idle-passive-loop';
import {
  DEFAULT_IDLE_CLIP_ID,
  isBannedAutoIdleClip,
  isRetiredIdleClip,
} from './idle-retired';

export const IDLE_VISIBLE_MIN_PLAYBACK = 0.62;

export const IDLE_V2_ROTATE_CATEGORIES = new Set(['breathe', 'think']);

export const IDLE_V2_INNERSCENE_STOCK = [
  'IdleInnersceneSam',
  'IdleInnersceneMaya',
  'IdleInnersceneHarper',
] as const;

export const IDLE_V2_QUATERNIUS_STOCK = [DEFAULT_IDLE_CLIP_ID] as const;

const DEV_V2_OFF_KEY = 'amoji.dev.idleV2Off';

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rotateOrderBySeed(ids: string[], seed: string): string[] {
  if (ids.length <= 1) return [...ids];
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  const start = hashSeed(seed) % sorted.length;
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}

function stockFamilyRotation(anchorId: string, available: ReadonlySet<string>): string[] {
  const fam = idleClipFamily(anchorId);
  const stock =
    fam === 'innerscene'
      ? IDLE_V2_INNERSCENE_STOCK
      : fam === 'quaternius'
        ? IDLE_V2_QUATERNIUS_STOCK
        : [];
  const picks = stock.filter((id) => available.has(id) && idleClipById(id));
  if (picks.length <= 1) return picks;
  return rotateOrderBySeed(picks, anchorId);
}

function calmRotateCandidates(
  available: ReadonlySet<string>,
  listenOnlyCalm?: boolean,
): string[] {
  const enabled = listEnabledIdleClipIds().filter(
    (id) => available.has(id) && !isRetiredIdleClip(id) && isHonorableIdleClip(id),
  );
  const cats = listenOnlyCalm ? new Set(['breathe']) : IDLE_V2_ROTATE_CATEGORIES;
  return enabled.filter((id) => {
    if (isBannedAutoIdleClip(id)) return false;
    const row = curatedRailByClipId(id);
    if (!row || !cats.has(row.category)) return false;
    return idleClipById(id)?.playable !== false;
  });
}

export function orderIdleV2VisibleClips(
  availableIds: readonly string[],
  characterId?: string | null,
  opts?: { listenOnlyCalm?: boolean },
): string[] {
  const available = new Set(
    availableIds.filter((id) => !isRetiredIdleClip(id) && idleClipById(id)),
  );
  const owner = characterId ? ownerCalmIdleClip(characterId) : null;
  if (owner && (available.has(owner) || idleClipById(owner))) return [owner];

  let candidates = calmRotateCandidates(available, opts?.listenOnlyCalm);
  if (!candidates.length) {
    const relax = orderPassiveIdleClips([...available], characterId);
    if (relax.length) return relax;
    return availableIds.length ? [availableIds[0]!] : [DEFAULT_IDLE_CLIP_ID];
  }

  if (candidates.length === 1) {
    const stock = stockFamilyRotation(candidates[0]!, available);
    if (stock.length > 1) candidates = stock;
  }

  const anchor = candidates[0]!;
  const sameFamily = candidates.filter((id) => idleCrossfadeCompatible(anchor, id));
  const order = sameFamily.length > 1
    ? rotateOrderBySeed(sameFamily, characterId ?? anchor)
    : sameFamily;
  return order.length ? order : [anchor];
}

export function isIdleV2Enabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_IDLE_V2_OFF === '1') return false;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(DEV_V2_OFF_KEY) === '1') return false;
  } catch { /* */ }
  return true;
}

export function idleClipPinsCanvas(clipId: string | null | undefined, passive: boolean): boolean {
  if (!clipId) return false;
  if (!isIdleV2Enabled()) return true;
  if (!passive) return true;
  return false;
}