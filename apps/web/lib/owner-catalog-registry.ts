/**
 * Unified owner catalog codes for Pixel keep/remove (CD### master + domain prefixes).
 * Consumed by owner-resources HTML generator and tooling.
 */
import { CMA_REACTION_GALLERY, CMA_REACTION_OWNER_WANT_CODES } from './cma-reaction-gallery';
import { CLASSIC_FAIRY_TALES } from './classic-fairy-tales';
import { DEMO_PHASE_BUTTONS } from './demo-phase';
import { CHAT_IDLE_CURATED } from './idle-curated-rail';
import { IDLE_LIBRARY } from './idle-library';
import { IDLE_OWNER_REF_CATALOG } from './idle-owner-ref-catalog';
import { STREAM_TRACKS } from './music-catalog';
import { HIGHEST_MV_OWNER_CODE } from './music-mv-registry';
import { OWNER_NEWS_CATALOG } from './owner-news-catalog';
import { PERFORMANCE_CLIPS } from './performance-clips';
import { performanceClipOwnerCode } from './performance-clip-owner';
import { POKE_SECTIONS } from './poke-zones';
import { POKE_LINE_TEMPLATES, VOICE_IDS } from './personality-voice';
import type { Lang } from './prefs';
import { RECORDED_POKE_ZONE } from './voice-clips';

export const OWNER_CATALOG_VERSION = '2026-11-18-owner-catalog-v1' as const;

/** Prefix table documented in docs/OWNER_RESOURCE_LIBRARY.md */
export const OWNER_CATALOG_PREFIXES = {
  CD: 'Master picker row — cite CD### for keep/remove in chat',
  MV: 'Mixkit stream beds (listen / style ask)',
  ST: 'PD fairy tales (Story chip)',
  DC: 'Performance library clips (dance/sing MP3)',
  ID: 'Idle VRMA library row or owner ref',
  PK: 'Poke section or TTS poke line bank',
  PH: 'Demo-phase chip (DemoPhaseRail)',
  NW: 'News RSS feed or AI-news template',
  CMA: 'Recorded poke SFX (CMA reaction pack)',
} as const;

export type OwnerCatalogPrefix = keyof typeof OWNER_CATALOG_PREFIXES;

export type OwnerCatalogTab = 'music' | 'stories' | 'demo' | 'news' | 'poke' | 'idle';

export interface OwnerCatalogRow {
  cdCode: string;
  prefix: OwnerCatalogPrefix;
  domainCode: string;
  tab: OwnerCatalogTab;
  kind: string;
  nativeId: string;
  label: string;
  sourceRef: string;
  inUse: boolean;
}

const LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];

function cd(n: number): string {
  return `CD${String(n).padStart(3, '0')}`;
}

function phCode(n: number): string {
  return `PH${String(n).padStart(3, '0')}`;
}

function idCode(libNum: number): string {
  return `ID${String(libNum).padStart(3, '0')}`;
}

function pkSectionCode(n: number): string {
  return `PK${String(n).padStart(3, '0')}`;
}

let pokeLineSeq = 0;
function pkLineCode(): string {
  pokeLineSeq += 1;
  return `PK${String(100 + pokeLineSeq).padStart(3, '0')}`;
}

export function buildOwnerCatalogIndex(): OwnerCatalogRow[] {
  const out: OwnerCatalogRow[] = [];
  let cdN = 0;
  const push = (row: Omit<OwnerCatalogRow, 'cdCode'>) => {
    cdN += 1;
    out.push({ ...row, cdCode: cd(cdN) });
  };

  pokeLineSeq = 0;

  for (let i = 0; i < PERFORMANCE_CLIPS.length; i++) {
    const c = PERFORMANCE_CLIPS[i]!;
    const domain = performanceClipOwnerCode(i + 1);
    push({
      prefix: 'DC',
      domainCode: domain,
      tab: 'music',
      kind: 'performance-clip',
      nativeId: c.id,
      label: c.labels.en,
      sourceRef: 'performance-clips.ts',
      inUse: true,
    });
  }

  for (const t of STREAM_TRACKS) {
    const domain = t.ownerCode ?? t.id;
    const inVault = !!t.ownerCode;
    push({
      prefix: inVault ? 'MV' : 'MV',
      domainCode: domain,
      tab: 'music',
      kind: t.ownerCode ? 'mixkit-stream' : 'mixkit-legacy',
      nativeId: domain,
      label: t.title,
      sourceRef: 'music-catalog.ts STREAM_TRACKS',
      inUse: inVault,
    });
  }

  for (const tale of CLASSIC_FAIRY_TALES) {
    const domain = tale.ownerCode ?? tale.id;
    push({
      prefix: 'ST',
      domainCode: domain,
      tab: 'stories',
      kind: 'fairy-tale',
      nativeId: domain,
      label: tale.title.en,
      sourceRef: 'classic-fairy-tales.ts',
      inUse: !!tale.ownerCode,
    });
  }

  DEMO_PHASE_BUTTONS.forEach((btn, i) => {
    const domain = phCode(i + 1);
    push({
      prefix: 'PH',
      domainCode: domain,
      tab: 'demo',
      kind: 'demo-phase-chip',
      nativeId: btn.id,
      label: btn.label.en,
      sourceRef: 'demo-phase.ts DEMO_PHASE_BUTTONS',
      inUse: true,
    });
  });

  for (const nw of OWNER_NEWS_CATALOG) {
    push({
      prefix: 'NW',
      domainCode: nw.ownerCode,
      tab: 'news',
      kind: nw.kind,
      nativeId: nw.urlOrTemplate,
      label: nw.label,
      sourceRef: 'owner-news-catalog.ts',
      inUse: true,
    });
  }

  POKE_SECTIONS.forEach((s, i) => {
    const domain = pkSectionCode(i + 1);
    push({
      prefix: 'PK',
      domainCode: domain,
      tab: 'poke',
      kind: 'poke-section',
      nativeId: s.id,
      label: s.labelTc,
      sourceRef: 'poke-zones.ts POKE_SECTIONS',
      inUse: true,
    });
  });

  for (const voice of VOICE_IDS) {
    for (const lang of LANGS) {
      const lines = POKE_LINE_TEMPLATES[voice][lang];
      lines.forEach((tpl, idx) => {
        const nativeId = `poke-tts-${voice}-${lang}-${idx}`;
        const domain = pkLineCode();
        push({
          prefix: 'PK',
          domainCode: domain,
          tab: 'poke',
          kind: 'poke-tts-line',
          nativeId,
          label: tpl.slice(0, 80),
          sourceRef: 'personality-voice.ts POKE_LINE_TEMPLATES',
          inUse: true,
        });
      });
    }
  }

  const wantCma = new Set<string>(CMA_REACTION_OWNER_WANT_CODES);
  for (const clip of CMA_REACTION_GALLERY) {
    push({
      prefix: 'CMA',
      domainCode: clip.code,
      tab: 'poke',
      kind: 'cma-sfx',
      nativeId: clip.code,
      label: clip.burst,
      sourceRef: 'cma-reaction-gallery.ts',
      inUse: wantCma.has(clip.code),
    });
  }

  for (const gender of ['female', 'male'] as const) {
    const table = RECORDED_POKE_ZONE[gender];
    for (const [zone, clipPath] of Object.entries(table)) {
      const code = clipPath.match(/CMA\d+/)?.[0] ?? '';
      const nativeId = `poke-sfx-${gender}-${zone}`;
      push({
        prefix: code ? 'CMA' : 'PK',
        domainCode: code || nativeId,
        tab: 'poke',
        kind: 'poke-zone-sfx',
        nativeId,
        label: `${gender} · ${zone}`,
        sourceRef: 'voice-clips.ts RECORDED_POKE_ZONE',
        inUse: code ? wantCma.has(code) : false,
      });
    }
  }

  for (const e of IDLE_LIBRARY) {
    push({
      prefix: 'ID',
      domainCode: idCode(e.num),
      tab: 'idle',
      kind: 'idle-library',
      nativeId: `lib-${e.clipId}`,
      label: e.name,
      sourceRef: 'idle-library.ts',
      inUse: e.defaultEnabled && e.playable && !e.retired,
    });
  }

  for (const ref of IDLE_OWNER_REF_CATALOG) {
    push({
      prefix: 'ID',
      domainCode: ref.ownerCode,
      tab: 'idle',
      kind: 'idle-owner-ref',
      nativeId: `ref-${ref.clipId}`,
      label: ref.name,
      sourceRef: 'idle-owner-ref-catalog.ts',
      inUse: false,
    });
  }

  for (const e of CHAT_IDLE_CURATED) {
    push({
      prefix: 'ID',
      domainCode: `ID-R${String(e.railNum).padStart(2, '0')}`,
      tab: 'idle',
      kind: 'idle-rail',
      nativeId: `rail-${e.railNum}-${e.clipId}`,
      label: e.labelKey,
      sourceRef: 'idle-curated-rail.ts',
      inUse: true,
    });
  }

  return out;
}

/** Lookup by picker row `data-id` (first match wins). */
export function ownerCatalogByNativeId(nativeId: string): OwnerCatalogRow | undefined {
  return buildOwnerCatalogIndex().find((r) => r.nativeId === nativeId);
}

export function ownerCatalogLookupMap(): Map<string, OwnerCatalogRow> {
  const map = new Map<string, OwnerCatalogRow>();
  for (const row of buildOwnerCatalogIndex()) {
    if (!map.has(row.nativeId)) map.set(row.nativeId, row);
  }
  return map;
}

export function ownerCatalogCounts(): Record<string, number> {
  const rows = buildOwnerCatalogIndex();
  const byPrefix: Record<string, number> = {};
  for (const r of rows) {
    byPrefix[r.prefix] = (byPrefix[r.prefix] ?? 0) + 1;
  }
  return {
    totalCd: rows.length,
    highestMv: HIGHEST_MV_OWNER_CODE,
    byPrefix: rows.length,
    ...byPrefix,
  };
}

export function ownerCatalogTsv(): string {
  const header = 'cdCode\tprefix\tdomainCode\ttab\tkind\tnativeId\tlabel\tinUse';
  const lines = buildOwnerCatalogIndex().map((r) =>
    [
      r.cdCode,
      r.prefix,
      r.domainCode,
      r.tab,
      r.kind,
      r.nativeId,
      r.label.replace(/\t/g, ' ').slice(0, 120),
      r.inUse ? '1' : '0',
    ].join('\t'),
  );
  return [header, ...lines].join('\n');
}