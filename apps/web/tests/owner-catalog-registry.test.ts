import { describe, expect, it } from 'vitest';
import {
  OWNER_CATALOG_PREFIXES,
  OWNER_CATALOG_VERSION,
  buildOwnerCatalogIndex,
  ownerCatalogTsv,
} from '../lib/owner-catalog-registry';
import { DEMO_PHASE_BUTTONS } from '../lib/demo-phase';
import { IDLE_OWNER_REF_CATALOG } from '../lib/idle-owner-ref-catalog';
import { MV_WORLD_COUNT, MV_WORLD_LAST } from '../lib/music-world-vault';
import { OWNER_NEWS_CATALOG } from '../lib/owner-news-catalog';
import { HIGHEST_MV_OWNER_CODE } from '../lib/music-mv-registry';

describe('owner-catalog-registry', () => {
  it('version and prefix table are defined', () => {
    expect(OWNER_CATALOG_VERSION).toMatch(/owner-catalog-v/);
    expect(OWNER_CATALOG_PREFIXES.CD).toContain('CD');
    expect(OWNER_CATALOG_PREFIXES.MV).toBeTruthy();
    expect(OWNER_CATALOG_PREFIXES.PH).toBeTruthy();
    expect(OWNER_CATALOG_PREFIXES.NW).toBeTruthy();
  });

  it('assigns unique CD codes for every indexed row', () => {
    const rows = buildOwnerCatalogIndex();
    expect(rows.length).toBeGreaterThan(500);
    const cds = new Set(rows.map((r) => r.cdCode));
    expect(cds.size).toBe(rows.length);
    expect(rows[0]?.cdCode).toBe('CD001');
  });

  it('includes demo-phase, news, idle refs, and MV118', () => {
    const rows = buildOwnerCatalogIndex();
    const ph = rows.filter((r) => r.prefix === 'PH');
    expect(ph.length).toBe(DEMO_PHASE_BUTTONS.length);
    const nw = rows.filter((r) => r.prefix === 'NW');
    expect(nw.length).toBe(OWNER_NEWS_CATALOG.length);
    const refs = rows.filter((r) => r.kind === 'idle-owner-ref');
    expect(refs.length).toBe(IDLE_OWNER_REF_CATALOG.length);
    expect(rows.some((r) => r.domainCode === `MV${String(MV_WORLD_LAST).padStart(3, '0')}`)).toBe(true);
    expect(HIGHEST_MV_OWNER_CODE).toBe(`MV${String(MV_WORLD_LAST).padStart(3, '0')}`);
    expect(MV_WORLD_COUNT).toBe(20);
  });

  it('exports TSV with header', () => {
    const tsv = ownerCatalogTsv();
    expect(tsv.split('\n')[0]).toContain('cdCode');
    expect(tsv).toContain('CD001');
  });
});