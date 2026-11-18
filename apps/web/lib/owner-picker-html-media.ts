/**
 * Server-side HTML for owner-resources motion previews + per-row audio players.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { IdleLibraryEntry } from './idle-library';
import { IDLE_LIBRARY, idleByClipId } from './idle-library';
import {
  PERF_MOTION_TAGS,
  resolvePerfMotion,
  type MotionTag,
} from './performance-motion';
import { CHAT_IDLE_CURATED } from './idle-curated-rail';
import { DEFAULT_IDLE_CLIP_ID } from './idle-retired';

export const OWNER_PICKER_PUBLIC_PREFIX = 'amoji-public-serve';
export const OWNER_PICKER_PREVIEW_SUBDIR = 'animations/owner-picker-previews';

export type OwnerMotionPreviewKind = 'gif' | 'webp' | 'mp4' | 'vrma' | 'placeholder';

export interface OwnerMotionPreview {
  id: string;
  kind: OwnerMotionPreviewKind;
  assetRaw: string | null;
  pagesSrc: string | null;
  note?: string;
}

export function pickerRawFromPublicRel(rel: string): string {
  return `${OWNER_PICKER_PUBLIC_PREFIX}/${rel.replace(/^\//, '')}`;
}

export function publicFileExists(publicRoot: string, relFromPublic: string): boolean {
  const clean = relFromPublic.replace(/^\//, '');
  return fs.existsSync(path.join(publicRoot, clean));
}

function previewPagesSrc(relFromPublic: string): string {
  return `../${relFromPublic.replace(/^\//, '')}`;
}

export const OWNER_PICKER_PREVIEW_CLIP_IDS: readonly string[] = [
  DEFAULT_IDLE_CLIP_ID,
  ...CHAT_IDLE_CURATED.map((r) => r.clipId),
  'lib_C03',
  'lib_C61',
  'lib_C62',
  'lib_C110',
  'Dance',
  'Sing',
  'lib_C85',
  'lib_C87',
  'lib_C90',
  'lib_C92',
  'lib_C95',
];

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MOTION_IMG_ONERROR =
  "this.hidden=true;this.closest('.motion-preview')?.classList.add('motion-preview--broken');";

function previewFromPublicRel(
  publicRoot: string,
  id: string,
  rel: string,
  kind: OwnerMotionPreviewKind,
): OwnerMotionPreview | null {
  if (!publicFileExists(publicRoot, rel)) return null;
  return {
    id,
    kind,
    assetRaw: pickerRawFromPublicRel(rel),
    pagesSrc: previewPagesSrc(rel),
  };
}

export function ownerPickerSidecarPreview(
  publicRoot: string,
  clipId: string,
): OwnerMotionPreview | null {
  for (const ext of ['gif', 'webp', 'mp4'] as const) {
    const rel = `${OWNER_PICKER_PREVIEW_SUBDIR}/${clipId}.${ext}`;
    const hit = previewFromPublicRel(publicRoot, clipId, rel, ext);
    if (hit) return hit;
  }
  return null;
}

export function resolveIdleMotionPreview(
  publicRoot: string,
  entry: Pick<IdleLibraryEntry, 'clipId' | 'path' | 'vrmaUrl' | 'playable'>,
): OwnerMotionPreview {
  const id = entry.clipId;
  const pathLower = entry.path.toLowerCase();
  if (pathLower.endsWith('.gif')) {
    const hit = previewFromPublicRel(publicRoot, id, entry.path, 'gif');
    if (hit) return hit;
    const sidecar = ownerPickerSidecarPreview(publicRoot, id);
    if (sidecar) return sidecar;
    return {
      id,
      kind: 'placeholder',
      assetRaw: null,
      pagesSrc: null,
      note: `GIF path ${entry.path} not on disk — run node scripts/generate-owner-picker-move-previews.mjs`,
    };
  }
  const sidecar = ownerPickerSidecarPreview(publicRoot, id);
  if (sidecar) return sidecar;

  const vrmaRel = entry.vrmaUrl ?? (entry.path.endsWith('.vrma') ? entry.path : `models/anims/${id}.vrma`);
  if (publicFileExists(publicRoot, vrmaRel)) {
    return {
      id,
      kind: 'vrma',
      assetRaw: pickerRawFromPublicRel(vrmaRel),
      pagesSrc: previewPagesSrc(vrmaRel),
      note: `VRMA on disk — bake: node scripts/generate-owner-picker-move-previews.mjs --clip ${id}`,
    };
  }
  return {
    id,
    kind: 'placeholder',
    assetRaw: null,
    pagesSrc: null,
    note: entry.playable ? `Awaiting ${vrmaRel}` : 'No local VRMA (record-only / FBX)',
  };
}

export function resolvePerfMotionPreview(publicRoot: string, tag: MotionTag): OwnerMotionPreview {
  const kind = tag === 'generic-sing' ? 'song' : 'dance';
  const profile = resolvePerfMotion({ id: 'owner-picker', kind, style: tag });
  const nativeId = `perf-motion-${tag}`;
  for (const clipId of profile.preferredClipIds) {
    const lib = idleByClipId(clipId);
    if (lib) {
      const prev = resolveIdleMotionPreview(publicRoot, lib);
      if (prev.kind !== 'placeholder') return { ...prev, id: nativeId };
    }
    const sidecar = ownerPickerSidecarPreview(publicRoot, clipId);
    if (sidecar) return { ...sidecar, id: nativeId };
    const vrmaRel = `models/anims/${clipId}.vrma`;
    if (publicFileExists(publicRoot, vrmaRel)) {
      return {
        id: nativeId,
        kind: 'vrma',
        assetRaw: pickerRawFromPublicRel(vrmaRel),
        pagesSrc: previewPagesSrc(vrmaRel),
        note: `Dance/sing tag ${tag} — bake ${clipId} preview`,
      };
    }
  }
  return {
    id: nativeId,
    kind: 'placeholder',
    assetRaw: null,
    pagesSrc: null,
    note: `Dance/sing body tag ${tag} — wire lib_C* VRMA + bake previews`,
  };
}

export function pokeSectionMotionPreview(publicRoot: string, sectionId: string): OwnerMotionPreview {
  const pokeGif = ownerPickerSidecarPreview(publicRoot, `poke-${sectionId}`);
  if (pokeGif) return pokeGif;
  const generic = ownerPickerSidecarPreview(publicRoot, 'poke-lean-demo');
  if (generic) return { ...generic, id: sectionId };
  return {
    id: sectionId,
    kind: 'placeholder',
    assetRaw: null,
    pagesSrc: null,
    note: 'Procedural poke blend (poke-zones.ts) — no looped GIF',
  };
}

export function motionPreviewCellHtml(preview: OwnerMotionPreview): string {
  const title = escapeHtml(preview.note ? `${preview.id}: ${preview.note}` : preview.id);
  if ((preview.kind === 'gif' || preview.kind === 'webp') && preview.pagesSrc) {
    return `<td class="motion-preview-cell"><div class="motion-preview" title="${title}">
      <img src="${escapeHtml(preview.pagesSrc)}" alt="${escapeHtml(preview.id)} move preview" width="80" height="80" loading="lazy" onerror="${MOTION_IMG_ONERROR}" />
    </div></td>`;
  }
  if (preview.kind === 'mp4' && preview.pagesSrc) {
    return `<td class="motion-preview-cell"><div class="motion-preview motion-preview--mp4" title="${title}">
      <video src="${escapeHtml(preview.pagesSrc)}" width="80" height="80" muted loop playsinline autoplay preload="metadata" aria-label="${escapeHtml(preview.id)} preview"
        onerror="this.closest('.motion-preview')?.classList.add('motion-preview--broken');this.remove();"></video>
    </div></td>`;
  }
  if (preview.kind === 'vrma' && preview.pagesSrc) {
    return `<td class="motion-preview-cell"><div class="motion-preview motion-preview--vrma" title="${title}">
      <a href="${escapeHtml(preview.pagesSrc)}" class="ref" title="VRMA (download)">${escapeHtml(path.basename(preview.pagesSrc))}</a>
    </div></td>`;
  }
  const note = preview.note ? ` title="${escapeHtml(preview.note)}"` : '';
  return `<td class="motion-preview-cell"${note}><div class="motion-preview motion-preview--missing">
    <span class="tag hold">no preview</span><br/><code class="ref">${escapeHtml(preview.id)}</code>
  </div></td>`;
}

export function audioPlayerBlockHtml(
  dataPlayRaw: string,
  ariaLabel: string,
  opts?: { remote?: boolean },
): string {
  const remoteCls = opts?.remote ? ' play-remote' : '';
  return `<div class="audio-player" data-play="${escapeHtml(dataPlayRaw)}">
    <button type="button" class="audio-play-toggle${remoteCls}" aria-label="Play ${escapeHtml(ariaLabel)}">▶</button>
    <button type="button" class="audio-stop" aria-label="Stop ${escapeHtml(ariaLabel)}" title="Stop">■</button>
    <input type="range" class="audio-scrub" min="0" max="100" value="0" step="0.1" disabled aria-label="Seek ${escapeHtml(ariaLabel)}" />
    <span class="audio-time"><span class="audio-cur">0:00</span> / <span class="audio-dur">0:00</span></span>
  </div>`;
}

export function audioPlayerCellHtml(
  dataPlayRaw: string,
  ariaLabel: string,
  opts?: { remote?: boolean },
): string {
  return `<td class="audio-player-cell">${audioPlayerBlockHtml(dataPlayRaw, ariaLabel, opts)}</td>`;
}

export function buildOwnerMotionPreviewRegistry(publicRoot: string): OwnerMotionPreview[] {
  const rows: OwnerMotionPreview[] = [];
  for (const e of IDLE_LIBRARY) {
    rows.push(resolveIdleMotionPreview(publicRoot, e));
  }
  for (const tag of PERF_MOTION_TAGS) {
    rows.push(resolvePerfMotionPreview(publicRoot, tag));
  }
  return rows;
}