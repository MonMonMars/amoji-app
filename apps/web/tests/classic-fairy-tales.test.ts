import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLASSIC_FAIRY_TALES,
  TALE_LENGTH_BANDS,
  classicFairyTalePublicPath,
  classicFairyTaleStats,
  formatTaleForSpeech,
  pickClassicFairyTale,
  spokenCharCount,
  talesForLength,
  type TaleLengthTier,
} from '../lib/classic-fairy-tales';
import {
  isClassicFairyTaleCacheWarm,
  resetClassicFairyTaleWarmForTests,
  resolvedClassicFairyTales,
  warmClassicFairyTaleCache,
} from '../lib/classic-fairy-tales-warm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PANEL = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
const RAIL = fs.readFileSync(path.join(ROOT, 'components/DemoPhaseRail.tsx'), 'utf8');
const PUBLIC_JSON = path.join(ROOT, 'public/stories/classic-fairy-tales.json');

const LANGS = ['en', 'yue', 'zh', 'ja'] as const;
const TIERS: TaleLengthTier[] = ['short', 'medium', 'long', 'veryLong'];

describe('classic fairy-tale catalog', () => {
  it('ships a multi-tale public-domain library with all length tiers', () => {
    const stats = classicFairyTaleStats();
    expect(stats.total).toBeGreaterThanOrEqual(8);
    expect(stats.slugs.length).toBeGreaterThanOrEqual(6);
    for (const tier of TIERS) {
      expect(stats.byLength[tier]).toBeGreaterThanOrEqual(2);
    }
    for (const lang of LANGS) {
      expect(stats.byLang[lang]).toBe(stats.total);
    }
  });

  it('covers en / yue / zh / ja with non-empty spoken text and PD attribution', () => {
    for (const tale of CLASSIC_FAIRY_TALES) {
      expect(tale.sourceUrl).toMatch(/^https?:\/\//);
      expect(tale.credit.toLowerCase()).toMatch(/public-domain|grimm|andersen|perrault|folk/);
      for (const lang of LANGS) {
        expect(tale.title[lang].trim().length).toBeGreaterThan(0);
        expect(tale.text[lang].trim().length).toBeGreaterThan(20);
        const spoken = formatTaleForSpeech(tale, lang);
        expect(spoken).toContain(tale.title[lang]);
        expect(/\s{2,}/.test(spoken)).toBe(false);
        expect(spoken).not.toMatch(/[?？]\s*$/);
      }
    }
  });

  it('keeps English spoken length ordered short < medium < long < veryLong', () => {
    const avg = (tier: TaleLengthTier) => {
      const pool = talesForLength(tier);
      const sum = pool.reduce((acc, t) => acc + spokenCharCount(formatTaleForSpeech(t, 'en')), 0);
      return sum / pool.length;
    };
    expect(avg('short')).toBeLessThan(avg('medium'));
    expect(avg('medium')).toBeLessThan(avg('long'));
    expect(avg('long')).toBeLessThan(avg('veryLong'));
    for (const tale of CLASSIC_FAIRY_TALES) {
      const n = spokenCharCount(formatTaleForSpeech(tale, 'en'));
      const band = TALE_LENGTH_BANDS[tale.length];
      expect(n).toBeGreaterThanOrEqual(band.min);
      expect(n).toBeLessThanOrEqual(band.max);
    }
  });

  it('rotates medium+ length tiers on repeat picks (never lead with flat short)', () => {
    const lengths = [0, 1, 2, 3, 4].map((n) => pickClassicFairyTale('en', n).length);
    expect(lengths.slice(0, 4)).toEqual(['medium', 'long', 'veryLong', 'long']);
    expect(lengths[4]).toBe('medium');
    expect(pickClassicFairyTale('yue', 0).text.yue.trim().length).toBeGreaterThan(20);
    expect(pickClassicFairyTale('ja', 2).text.ja.trim().length).toBeGreaterThan(20);
  });

  it('EN spoken tales are longer emotional retellings, not tiny summaries', () => {
    expect(TALE_LENGTH_BANDS.short.min).toBeGreaterThanOrEqual(400);
    expect(TALE_LENGTH_BANDS.veryLong.min).toBeGreaterThanOrEqual(1500);
    for (const tale of CLASSIC_FAIRY_TALES) {
      const body = tale.text.en;
      expect(body).toMatch(/"|'|“|‘|「/); // dialogue / spoken beat
      expect(spokenCharCount(formatTaleForSpeech(tale, 'en'))).toBeGreaterThan(400);
    }
  });

  it('mirrors the catalog in public JSON for predownload', () => {
    expect(fs.existsSync(PUBLIC_JSON)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(PUBLIC_JSON, 'utf8')) as {
      tales: unknown[];
      attribution: string;
    };
    expect(raw.tales.length).toBe(CLASSIC_FAIRY_TALES.length);
    expect(raw.attribution.toLowerCase()).toMatch(/grimm|andersen|perrault/);
    expect(classicFairyTalePublicPath()).toBe('/stories/classic-fairy-tales.json');
  });
});

describe('classic fairy-tale predownload / warm', () => {
  afterEach(() => {
    resetClassicFairyTaleWarmForTests();
    vi.unstubAllGlobals();
  });

  it('marks warm from bundled catalog even when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    const result = await warmClassicFairyTaleCache();
    expect(result.ok).toBe(true);
    expect(result.bundled).toBe(CLASSIC_FAIRY_TALES.length);
    expect(isClassicFairyTaleCacheWarm()).toBe(true);
    expect(resolvedClassicFairyTales().length).toBe(CLASSIC_FAIRY_TALES.length);
    // Second call shares the same promise / does not refetch.
    const again = await warmClassicFairyTaleCache();
    expect(again).toBe(result);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('merges fetched JSON tales into the resolved catalog', async () => {
    const payload = {
      tales: [
        {
          id: 'extra-beanstalk-short',
          slug: 'jack-and-the-beanstalk',
          length: 'short',
          author: 'English folk tale (public domain)',
          credit: 'Public-domain Jack and the Beanstalk tradition',
          sourceUrl: 'https://www.gutenberg.org/ebooks/11592',
          title: { en: 'Jack and the Beanstalk', yue: '傑克與魔豆', zh: '杰克与魔豆', ja: 'ジャックと豆の木' },
          text: {
            en: 'Jack traded a cow for magic beans, climbed a giant beanstalk, and brought home a golden hen.',
            yue: '傑克用牛換魔法豆，爬上巨大豆莖，帶返一隻金蛋母雞。',
            zh: '杰克用牛换魔法豆，爬上巨大豆茎，带回一只金蛋母鸡。',
            ja: 'ジャックは牛を魔法の豆と交換し、巨大な豆の木を登って金の卵を産むめんどりを持ち帰りました。',
          },
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => payload,
      })),
    );
    const result = await warmClassicFairyTaleCache();
    expect(result.fetched).toBe(1);
    expect(resolvedClassicFairyTales().some((t) => t.id === 'extra-beanstalk-short')).toBe(true);
  });
});

describe('demo talking-phase Story wiring', () => {
  it('ChatPanel warms catalog and speaks from the classic bank on Story', () => {
    expect(PANEL).toContain('warmClassicFairyTaleCache');
    expect(PANEL).toContain('pickClassicFairyTale');
    expect(PANEL).toContain('formatTaleForSpeech');
    expect(PANEL).toContain("id === 'story'");
    expect(PANEL).toContain('storyTellCountRef');
    expect(PANEL).toContain('STORY_SPEECH_HINTS');
    expect(PANEL).toContain('STORY_SPEECH_RATE_BIAS');
    // Showcase yes no longer routes story through a thin LLM stub.
    expect(PANEL).not.toContain('showcaseStoryAsk');
  });

  it('DemoPhaseRail warms on Story hover / focus / press', () => {
    expect(RAIL).toContain('onWarmStory');
    expect(RAIL).toContain("btn.id === 'story'");
    expect(RAIL).toContain('onPointerEnter');
  });
});
