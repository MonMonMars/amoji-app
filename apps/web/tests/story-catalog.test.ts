import { describe, expect, it } from 'vitest';
import {
  CLASSIC_FAIRY_TALES,
  formatTaleForSpeech,
  pickClassicFairyTale,
  spokenCharCount,
  talesForLength,
} from '../lib/classic-fairy-tales';
import {
  STORY_CATALOG_COUNT,
  assertUniqueStoryOwnerCodes,
  highestStoryOwnerCode,
  pickClassicFairyTaleForIntent,
  storyCatalogRows,
  storyOwnerCode,
  taleByOwnerCode,
} from '../lib/story-catalog';

describe('story catalog (ST###)', () => {
  it('assigns unique ST codes ST001 through ST038', () => {
    assertUniqueStoryOwnerCodes();
    expect(STORY_CATALOG_COUNT()).toBe(38);
    expect(highestStoryOwnerCode()).toBe('ST038');
    expect(taleByOwnerCode('st001')?.slug).toBe('little-red-riding-hood');
    expect(taleByOwnerCode('ST009')?.slug).toBe('jack-and-the-beanstalk');
    expect(storyOwnerCode(38)).toBe('ST038');
  });

  it('lists every row for Pixel with en title', () => {
    const rows = storyCatalogRows();
    expect(rows.length).toBe(38);
    expect(new Set(rows.map((r) => r.ownerCode)).size).toBe(38);
    for (const row of rows) {
      expect(row.titleEn.length).toBeGreaterThan(2);
    }
  });

  it('story planner still prefers medium+ long bodies on rotation', () => {
    const lengths = [0, 1, 2, 3].map((n) => pickClassicFairyTale('en', n).length);
    expect(lengths).toEqual(['medium', 'long', 'veryLong', 'long']);
    const longPool = talesForLength('long');
    expect(longPool.length).toBeGreaterThanOrEqual(4);
    const picked = pickClassicFairyTale('en', 1);
    expect(spokenCharCount(formatTaleForSpeech(picked, 'en'))).toBeGreaterThanOrEqual(800);
  });

  it('honors ST### in user text before rotation', () => {
    const picked = pickClassicFairyTaleForIntent('en', 0, 'tell ST007 please', CLASSIC_FAIRY_TALES);
    expect(picked.ownerCode).toBe('ST007');
    expect(picked.slug).toBe('snow-white');
  });

  it('every catalog row has ownerCode aligned with id', () => {
    for (const tale of CLASSIC_FAIRY_TALES) {
      expect(tale.ownerCode).toMatch(/^ST\d{3}$/);
    }
  });
});