import type { Lang } from './prefs';
import {
  portalNewsFeedUrls,
  regionalLightNewsFeedUrls,
  regionalNewsFeedUrls,
  type NewsRegion,
} from './live-tools';

export interface OwnerNewsCatalogRow {
  ownerCode: string;
  kind: 'rss-feed' | 'ai-news-template' | 'portal-feed';
  region: NewsRegion | 'all';
  lang: Lang | 'all';
  label: string;
  urlOrTemplate: string;
  license: string;
  usedBy: string;
}

function nwCode(n: number): string {
  return `NW${String(n).padStart(3, '0')}`;
}

const UNIQUE_FEEDS = new Map<string, { region: NewsRegion | 'all'; label: string }>();

function addFeed(url: string, region: NewsRegion | 'all', label: string) {
  if (!url || UNIQUE_FEEDS.has(url)) return;
  UNIQUE_FEEDS.set(url, { region, label });
}

const REGIONS: NewsRegion[] = [
  'HK',
  'TW',
  'JP',
  'US',
  'UK',
  'CN',
  'SG',
  'MY',
  'IN',
  'AU',
  'CA',
  'DE',
  'FR',
  'general',
];

for (const region of REGIONS) {
  for (const url of regionalNewsFeedUrls(region)) {
    addFeed(url, region, `Regional wire · ${region}`);
  }
  for (const url of regionalLightNewsFeedUrls(region)) {
    addFeed(url, region, `Light category · ${region}`);
  }
}
for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
  for (const url of portalNewsFeedUrls('HK', lang)) addFeed(url, 'HK', `Portal · HK (${lang})`);
}

const AI_NEWS_TEMPLATES: { label: string; template: string; lang: Lang }[] = [
  { label: 'AI news (EN)', template: 'latest AI news', lang: 'en' },
  { label: 'AI news (YUE)', template: 'AI新聞', lang: 'yue' },
  { label: 'AI news (ZH)', template: 'AI新闻', lang: 'zh' },
  { label: 'AI news (JA)', template: 'AIニュース', lang: 'ja' },
  { label: 'Cheerful news (EN)', template: 'any cheerful news today?', lang: 'en' },
  { label: 'Topical science (EN)', template: 'science discovery news', lang: 'en' },
];

export function buildOwnerNewsCatalog(): readonly OwnerNewsCatalogRow[] {
  const out: OwnerNewsCatalogRow[] = [];
  let n = 1;
  for (const [url, meta] of [...UNIQUE_FEEDS.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    out.push({
      ownerCode: nwCode(n++),
      kind: meta.label.startsWith('Portal') ? 'portal-feed' : 'rss-feed',
      region: meta.region,
      lang: 'all',
      label: meta.label,
      urlOrTemplate: url,
      license: 'Public RSS (read-only)',
      usedBy: 'live-tools.ts regionalNewsFeedUrls · fetchRecentHeadlines',
    });
  }
  for (const tpl of AI_NEWS_TEMPLATES) {
    out.push({
      ownerCode: nwCode(n++),
      kind: 'ai-news-template',
      region: 'all',
      lang: tpl.lang,
      label: tpl.label,
      urlOrTemplate: tpl.template,
      license: 'Original prompt',
      usedBy: 'demo-phase aiNews chip · live-tools NEWS_RE',
    });
  }
  return out;
}

export const OWNER_NEWS_CATALOG = buildOwnerNewsCatalog();
export const HIGHEST_NW_OWNER_CODE = OWNER_NEWS_CATALOG[OWNER_NEWS_CATALOG.length - 1]?.ownerCode ?? 'NW000';