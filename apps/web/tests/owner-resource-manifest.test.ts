import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CMA_REACTION_OWNER_WANT_CODES,
} from '../lib/cma-reaction-gallery';
import { assertCuratedRailValid } from '../lib/idle-curated-rail';
import { MV_VAULT_COUNT } from '../lib/music-mv-registry';
import { STORY_CATALOG_COUNT } from '../lib/story-catalog';
import {
  OWNER_CMA_WANT,
  OWNER_RESOURCE_LIBRARY_DOC,
  OWNER_RESOURCE_MANIFEST_VERSION,
  buildOwnerResourceIndex,
  ownerCuratedIdlePlayableClipIds,
  ownerIdleLibraryStats,
} from '../lib/owner-resource-manifest';

describe('owner-resource-manifest', () => {
  it('manifest version is set', () => {
    expect(OWNER_RESOURCE_MANIFEST_VERSION).toMatch(/owner-resource-v\d+/);
  });

  it('CMA Want re-exports match gallery SoT', () => {
    expect([...OWNER_CMA_WANT].sort()).toEqual([...CMA_REACTION_OWNER_WANT_CODES].sort());
  });

  it('curated idle rail entries are playable', () => {
    assertCuratedRailValid();
    const playable = ownerCuratedIdlePlayableClipIds();
    expect(playable.length).toBeGreaterThanOrEqual(35);
    expect(playable).toContain('IdleQuaterniusHuman');
  });

  it('idle library stats align with curated rail length', () => {
    const stats = ownerIdleLibraryStats();
    expect(stats.curatedRail).toBeGreaterThanOrEqual(35);
    expect(stats.playable).toBeGreaterThan(stats.curatedRail);
  });

  it('buildOwnerResourceIndex lists every ST fairy-tale row', () => {
    const index = buildOwnerResourceIndex();
    const stRows = index.filter((e) => e.type === 'story-fairy-tale');
    expect(stRows.length).toBe(STORY_CATALOG_COUNT());
    expect(stRows.some((e) => e.id === 'ST001')).toBe(true);
    expect(stRows.some((e) => e.id === 'ST038')).toBe(true);
  });

  it('buildOwnerResourceIndex lists every MV vault stream row', () => {
    const index = buildOwnerResourceIndex();
    const mvRows = index.filter((e) => e.type === 'music-stream' && e.id.startsWith('MV'));
    expect(mvRows.length).toBe(MV_VAULT_COUNT);
    expect(mvRows.some((e) => e.id === 'MV039')).toBe(true);
    expect(mvRows.some((e) => e.id === 'MV098')).toBe(true);
  });

  it('buildOwnerResourceIndex includes every Want code once', () => {
    const index = buildOwnerResourceIndex();
    const wantRows = index.filter((e) => e.type === 'cma-poke-sfx' && e.status === 'wired');
    const ids = new Set(wantRows.map((e) => e.id));
    for (const code of CMA_REACTION_OWNER_WANT_CODES) {
      expect(ids.has(code)).toBe(true);
    }
    expect(ids.size).toBe(CMA_REACTION_OWNER_WANT_CODES.length);
  });

  it('OWNER_RESOURCE_LIBRARY.md exists and lists manifest path', () => {
    const docPath = path.join(__dirname, '../../../', OWNER_RESOURCE_LIBRARY_DOC);
    expect(fs.existsSync(docPath)).toBe(true);
    const text = fs.readFileSync(docPath, 'utf8');
    expect(text).toContain('owner-resource-manifest.ts');
    expect(text).toContain('SFX_WANT_LIST.md');
    for (const code of CMA_REACTION_OWNER_WANT_CODES) {
      expect(text).toContain(code);
    }
  });

  it('SFX_WANT_LIST.md matches CMA Want codes', () => {
    const wantDoc = fs.readFileSync(
      path.join(__dirname, '../../../docs/SFX_WANT_LIST.md'),
      'utf8',
    );
    for (const code of CMA_REACTION_OWNER_WANT_CODES) {
      expect(wantDoc).toContain(code);
    }
  });
});