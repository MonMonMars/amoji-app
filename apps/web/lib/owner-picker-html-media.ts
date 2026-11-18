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

export const OWNER_PICKER_PUBLIC_PREFIX = 'amoji-public-serve';

export type OwnerMotionPreviewKind = 'gif' | 'vrma' | 'placeholder';

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveIdleMotionPreview(
  publicRoot: string,
  entry: Pick<IdleLibraryEntry, 'clipId' | 'path' | 'vrmaUrl' | 'playable'>,
): OwnerMotionPreview {
  const id = entry.clipId;
  const pathLower = entry.path.toLowerCase();
  if (pathLower.endsWith('.gif')) {
    const raw = pickerRawFromPublicRel(entry.path);
    const pagesSrc = `../${entry.path.replace(/^\//, '')}`;
    if (publicFileExists(publicRoot, entry.path)) {
      return { id, kind: 'gif', assetRaw: raw, pagesSrc };
    }
    return {
      id,
      kind: 'placeholder',
      assetRaw: null,
      pagesSrc: null,
      note: `GIF path ${entry.path} not on disk — optional: node scripts/export-idle-gif-preview.mjs`,
    };
  }
  const vrmaRel = entry.vrmaUrl ?? (entry.path.endsWith('.vrma') ? entry.path : `models/anims/${id}.vrma`);
  if (publicFileExists(publicRoot, vrmaRel)) {
    const raw = pickerRawFromPublicRel(vrmaRel);
  const pagesSrc = `../${vrmaRel.replace(/^\//, '')}`;
    return { id, kind: 'vrma', assetRaw: raw, pagesSrc };
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
    const vrmaRel = `models/anims/${clipId}.vrma`;
    if (publicFileExists(publicRoot, vrmaRel)) {
      const raw = pickerRawFromPublicRel(vrmaRel);
      return { id: nativeId, kind: 'vrma', assetRaw: raw, pagesSrc: `../${vrmaRel}` };
    }
  }
  return {
    id: nativeId,
    kind: 'placeholder',
    assetRaw: null,
    pagesSrc: null,
    note: `Dance/sing body tag ${tag} — wire lib_C* VRMA`,
  };
}

export function pokeSectionMotionPreview(sectionId: string): OwnerMotionPreview {
  return {
    id: sectionId,
    kind: 'placeholder',
    assetRaw: null,
    pagesSrc: null,
    note: 'Procedural poke blend (poke-zones.ts) — no looped GIF',
  };
}

export function motionPreviewCellHtml(preview: OwnerMotionPreview): string {
  if (preview.kind === 'gif' && preview.pagesSrc) {
    return `<td class="motion-preview-cell"><div class="motion-preview" title="${escapeHtml(preview.id)}">
      <img src="${escapeHtml(preview.pagesSrc)}" alt="${escapeHtml(preview.id)} preview" width="80" height="80" loading="lazy" />
    </div></td>`;
  }
  if (preview.kind === 'vrma' && preview.pagesSrc) {
    return `<td class="motion-preview-cell"><div class="motion-preview motion-preview--vrma">
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