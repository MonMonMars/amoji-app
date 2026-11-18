/**
 * Machine-readable owner free-resource index (DRY).
 * Canonical human doc: `docs/OWNER_RESOURCE_LIBRARY.md`
 *
 * Agents: consult this manifest + the doc before swapping defaults
 * (idle rail, poke SFX, cast voices, performance clips).
 */

import {
  CMA_REACTION_ARCHIVE_CODES,
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_KEEP_CODES,
  CMA_REACTION_OWNER_DELETE_CODES,
  CMA_REACTION_OWNER_WANT_CODES,
} from './cma-reaction-gallery';
import { CHARACTERS_WANT, FROZEN_CC0_IDS, WANT_CAST_RELEASE } from './characters-want';
import { CHAT_IDLE_CURATED, type IdleCuratedRailEntry } from './idle-curated-rail';
import { curatedLibraryRow } from './idle-curated-rail';
import { IDLE_LIBRARY } from './idle-library';
import {
  HELD_GPU_ENGINES,
  SKIPPED_ENGINES,
  VOICE_CATALOG,
  type VoiceOption,
} from './voice-catalog';
import { STREAM_TRACKS } from './music-catalog';
import { HIGHEST_MV_OWNER_CODE, MV_VAULT_COUNT } from './music-mv-registry';
import { CLASSIC_FAIRY_TALES } from './classic-fairy-tales';
import { highestStoryOwnerCode } from './story-catalog';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERFORMANCE_CLIPS } from './performance-clips';
import { RECORDED_POKE_ZONE } from './voice-clips';
import { buildOwnerMotionPreviewRegistry } from './owner-picker-html-media';

export const OWNER_RESOURCE_LIBRARY_DOC = 'docs/OWNER_RESOURCE_LIBRARY.md';
export const OWNER_RESOURCE_MANIFEST_VERSION = '2026-11-18-owner-resource-v2' as const;

export type OwnerResourceStatus =
  | 'wired'
  | 'record-only'
  | 'optional'
  | 'archive'
  | 'unused'
  | 'placeholder';

export interface OwnerResourceEntry {
  type: string;
  id: string;
  pathOrUrl: string;
  usedBy: string;
  status: OwnerResourceStatus;
  notes?: string;
  previewKind?: 'gif' | 'vrma' | 'placeholder';
  previewPath?: string;
}

function webPublicRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
}

/** Standing rule text — also in OWNER_REQUEST_LOG + OWNER_RESOURCE_LIBRARY.md */
export const OWNER_RESOURCE_CONSULT_RULE =
  'Before swapping idle, poke SFX, cast, TTS, or music defaults, read docs/OWNER_RESOURCE_LIBRARY.md and import from owner-resource-manifest.ts.';

export const OWNER_CMA_WANT = [...CMA_REACTION_OWNER_WANT_CODES] as const;
export const OWNER_CMA_ARCHIVE = [...CMA_REACTION_ARCHIVE_CODES] as const;
export const OWNER_CMA_DELETE = [...CMA_REACTION_OWNER_DELETE_CODES] as const;
export const OWNER_CMA_KEEP = [...CMA_REACTION_KEEP_CODES] as const;
export const OWNER_CMA_GALLERY_KEY = CMA_REACTION_GALLERY_KEY;

export const OWNER_IDLE_CURATED_RAIL: readonly IdleCuratedRailEntry[] = CHAT_IDLE_CURATED;

export const OWNER_WANT_CAST_RELEASE = WANT_CAST_RELEASE;
export const OWNER_WANT_CHARACTER_IDS = CHARACTERS_WANT.map((c) => c.id);
export const OWNER_FROZEN_CC0_CHARACTER_IDS = [...FROZEN_CC0_IDS];

export const OWNER_SHIPPING_VOICES: readonly VoiceOption[] = VOICE_CATALOG.filter((v) => v.shipping);
export const OWNER_OPTIONAL_TTS_HELD = [...HELD_GPU_ENGINES];
export const OWNER_OPTIONAL_TTS_SKIPPED = [...SKIPPED_ENGINES];

export const OWNER_PERFORMANCE_CLIP_IDS = PERFORMANCE_CLIPS.map((c) => c.id);

/** Poke zone paths — must stay aligned with docs/SFX_WANT_LIST.md */
export const OWNER_RECORDED_POKE_ZONE = RECORDED_POKE_ZONE;

/** Idle library rows referenced by curated rail (playable check at runtime). */
export function ownerCuratedIdlePlayableClipIds(): string[] {
  return CHAT_IDLE_CURATED.map((e) => e.clipId).filter((clipId) => !!curatedLibraryRow(clipId));
}

/** Full idle library count + playable count for agents. */
export function ownerIdleLibraryStats(): { total: number; playable: number; curatedRail: number } {
  const playable = IDLE_LIBRARY.filter((e) => e.playable && !e.retired).length;
  return {
    total: IDLE_LIBRARY.length,
    playable,
    curatedRail: CHAT_IDLE_CURATED.length,
  };
}

/**
 * Flat index for tooling — derived from SoT modules above (no duplicate catalogs).
 */
export function buildOwnerResourceIndex(): OwnerResourceEntry[] {
  const out: OwnerResourceEntry[] = [];

  for (const code of CMA_REACTION_OWNER_WANT_CODES) {
    out.push({
      type: 'cma-poke-sfx',
      id: code,
      pathOrUrl: `/voice-clips/cma-reaction/${code}_universal_*.mp3`,
      usedBy: 'voice-clips.ts RECORDED_POKE_ZONE · cma-reaction-gallery.ts',
      status: 'wired',
      notes: 'docs/SFX_WANT_LIST.md Want row',
    });
  }

  for (const code of CMA_REACTION_ARCHIVE_CODES) {
    out.push({
      type: 'cma-poke-sfx',
      id: code,
      pathOrUrl: `/voice-clips/cma-reaction/`,
      usedBy: 'cma-reaction-gallery.ts · /sfx-gallery Want',
      status: 'archive',
    });
  }

  for (const e of CHAT_IDLE_CURATED) {
    const lib = curatedLibraryRow(e.clipId);
    out.push({
      type: 'idle-vrma',
      id: e.clipId,
      pathOrUrl: lib?.vrmaUrl ?? `models/anims/${e.clipId}.vrma`,
      usedBy: 'idle-curated-rail.ts · idle-enabled.ts · CompanionCanvas',
      status: lib ? 'wired' : 'unused',
      notes: `rail #${e.railNum} · legacy lib #${e.legacyLibNum}`,
    });
  }

  for (const c of CHARACTERS_WANT) {
    out.push({
      type: 'character-vrm',
      id: c.id,
      pathOrUrl: c.model.startsWith('http') ? c.model : `models/${c.model}`,
      usedBy: 'characters-want.ts · prefs.ts cast',
      status: 'wired',
      notes: `release ${WANT_CAST_RELEASE}`,
    });
  }

  for (const v of VOICE_CATALOG.filter((row) => row.shipping)) {
    out.push({
      type: `voice-${v.engine}`,
      id: v.id,
      pathOrUrl: v.engine === 'edge' ? `edge-tts / gtts tl` : `browser speech`,
      usedBy: 'voice-catalog.ts · voice-capability.ts · tts-chain.ts',
      status: 'wired',
      notes: `${v.locale} ${v.gender}`,
    });
  }

  for (const h of HELD_GPU_ENGINES) {
    out.push({
      type: 'tts-optional',
      id: h.engine,
      pathOrUrl: 'not in repo',
      usedBy: 'voice-catalog.ts HELD_GPU_ENGINES',
      status: 'optional',
      notes: h.notes,
    });
  }

  for (const clip of PERFORMANCE_CLIPS) {
    out.push({
      type: `music-${clip.kind}`,
      id: clip.id,
      pathOrUrl: clip.file,
      usedBy: 'performance-clips.ts · music.ts',
      status: 'wired',
      notes: clip.license,
    });
  }

  for (const t of STREAM_TRACKS) {
    if (!t.ownerCode) continue;
    out.push({
      type: 'music-stream',
      id: t.ownerCode,
      pathOrUrl: t.url,
      usedBy: 'music-catalog.ts · music-mv-registry.ts',
      status: 'wired',
      notes: `${t.title} · ${t.license} · MV039–${HIGHEST_MV_OWNER_CODE} owner Mixkit index`,
    });
  }

  for (const tale of CLASSIC_FAIRY_TALES) {
    if (!tale.ownerCode) continue;
    out.push({
      type: 'story-fairy-tale',
      id: tale.ownerCode,
      pathOrUrl: `/stories/classic-fairy-tales.json#${tale.id}`,
      usedBy: 'classic-fairy-tales.ts · ChatPanel Story chip',
      status: 'wired',
      notes: `${tale.title.en} · ${tale.length} · ${highestStoryOwnerCode()} cap`,
    });
  }

  for (const preview of buildOwnerMotionPreviewRegistry(webPublicRoot())) {
    if (preview.kind === 'placeholder') continue;
    out.push({
      type: 'owner-picker-motion-preview',
      id: preview.id,
      pathOrUrl: preview.pagesSrc ?? preview.assetRaw ?? '',
      usedBy: 'owner-resources.html · motion preview column',
      status: preview.kind === 'gif' ? 'wired' : 'optional',
      notes: preview.note,
      previewKind: preview.kind,
      previewPath: preview.pagesSrc ?? undefined,
    });
  }

  return out;
}