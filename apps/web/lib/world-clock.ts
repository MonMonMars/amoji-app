// Demo / showcase world clock — Intl time zones only (no LLM, no network).
import type { Lang } from './prefs';

function asWorldClockLang(lang?: string): Lang {
  if (lang === 'en' || lang === 'zh' || lang === 'ja' || lang === 'yue') return lang;
  return 'yue';
}

export type WorldClockCity = {
  id: string;
  timeZone: string;
  label: Record<Lang, string>;
};

/** Yue-friendly city names — stable order for the default world tour. */
export const WORLD_CLOCK_TOUR: readonly WorldClockCity[] = [
  {
    id: 'hk',
    timeZone: 'Asia/Hong_Kong',
    label: { yue: '香港', zh: '香港', ja: '香港', en: 'Hong Kong' },
  },
  {
    id: 'tokyo',
    timeZone: 'Asia/Tokyo',
    label: { yue: '東京', zh: '东京', ja: '東京', en: 'Tokyo' },
  },
  {
    id: 'london',
    timeZone: 'Europe/London',
    label: { yue: '倫敦', zh: '伦敦', ja: 'ロンドン', en: 'London' },
  },
  {
    id: 'nyc',
    timeZone: 'America/New_York',
    label: { yue: '紐約', zh: '纽约', ja: 'ニューヨーク', en: 'New York' },
  },
  {
    id: 'la',
    timeZone: 'America/Los_Angeles',
    label: { yue: '洛杉磯', zh: '洛杉矶', ja: 'ロサンゼルス', en: 'Los Angeles' },
  },
  {
    id: 'sydney',
    timeZone: 'Australia/Sydney',
    label: { yue: '悉尼', zh: '悉尼', ja: 'シドニー', en: 'Sydney' },
  },
] as const;

const ASIA_EXTRA: readonly string[] = ['Asia/Singapore', 'Asia/Seoul', 'Asia/Taipei'];
const EURO_EXTRA: readonly string[] = ['Europe/Paris', 'Europe/Berlin'];

function intlLocale(lang: Lang): string {
  if (lang === 'yue') return 'zh-HK';
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'ja') return 'ja-JP';
  return 'en-US';
}

export function resolveUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Clock string for one zone — TTS-friendly (no seconds). */
export function formatClockInZone(timeZone: string, lang: Lang, at: Date = new Date()): string {
  const locale = intlLocale(lang);
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: lang === 'en',
    }).format(at);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: lang === 'en',
    }).format(at);
  }
}

function cityByZone(timeZone: string): WorldClockCity | undefined {
  return WORLD_CLOCK_TOUR.find((c) => c.timeZone === timeZone);
}

function labelForZone(timeZone: string, lang: Lang): string {
  const known = cityByZone(timeZone);
  if (known) return known.label[lang];
  try {
    const parts = timeZone.split('/');
    const tail = parts[parts.length - 1] ?? timeZone;
    return tail.replace(/_/g, ' ');
  } catch {
    return timeZone;
  }
}

function localLead(lang: Lang, clock: string): string {
  if (lang === 'yue') return `你而家大約 ${clock}`;
  if (lang === 'zh') return `你现在大约 ${clock}`;
  if (lang === 'ja') return `あなたのところは今およそ ${clock}`;
  return `Where you are it's about ${clock}`;
}

function joinCityTimes(lang: Lang, pairs: { label: string; clock: string }[]): string {
  if (!pairs.length) return '';
  if (lang === 'yue' || lang === 'zh') {
    return pairs.map((p) => `${p.label} ${p.clock}`).join('，');
  }
  if (lang === 'ja') {
    return pairs.map((p) => `${p.label}は${p.clock}`).join('、');
  }
  return pairs.map((p) => `${p.label} ${p.clock}`).join('; ');
}

function pairZone(timeZone: string, lang: Lang, at: Date): { label: string; clock: string } {
  return {
    label: labelForZone(timeZone, lang),
    clock: formatClockInZone(timeZone, lang, at),
  };
}

/** How many spoken facets rotate on repeat demo-chip taps. */
export function worldClockFacetCount(): number {
  return 4;
}

/**
 * Spoken world clock for demo chip + showcase — local time first, then cities.
 * `facet` rotates which city set is emphasized (repeat taps).
 */
export function spokenWorldClock(lang?: string, facet = 0, at: Date = new Date()): string {
  const L = asWorldClockLang(lang);
  const userTz = resolveUserTimeZone();
  const localClock = formatClockInZone(userTz, L, at);
  const lead = localLead(L, localClock);

  const f = Math.abs(facet) % worldClockFacetCount();

  if (f === 0) {
    const cities = WORLD_CLOCK_TOUR.slice(0, 4).map((c) =>
      pairZone(c.timeZone, L, at),
    );
    const tail = joinCityTimes(L, cities);
    if (L === 'yue' || L === 'zh') return `${lead}；${tail}。`;
    if (L === 'ja') return `${lead}。${tail}。`;
    return `${lead}. ${tail}.`;
  }

  if (f === 1) {
    const cities = [
      pairZone('Asia/Hong_Kong', L, at),
      pairZone('Asia/Tokyo', L, at),
      ...ASIA_EXTRA.map((tz) => pairZone(tz, L, at)),
    ];
    const tail = joinCityTimes(L, cities);
    if (L === 'yue' || L === 'zh') return `${lead}；亞洲一帶：${tail}。`;
    if (L === 'ja') return `${lead}。アジア：${tail}。`;
    return `${lead}. Asia: ${tail}.`;
  }

  if (f === 2) {
    const cities = [
      pairZone('Europe/London', L, at),
      ...EURO_EXTRA.map((tz) => pairZone(tz, L, at)),
      pairZone('America/New_York', L, at),
      pairZone('America/Los_Angeles', L, at),
    ];
    const tail = joinCityTimes(L, cities);
    if (L === 'yue' || L === 'zh') return `${lead}；歐美：${tail}。`;
    if (L === 'ja') return `${lead}。欧米：${tail}。`;
    return `${lead}. Europe & Americas: ${tail}.`;
  }

  const cities = WORLD_CLOCK_TOUR.map((c) => pairZone(c.timeZone, L, at));
  const tail = joinCityTimes(L, cities);
  if (L === 'yue' || L === 'zh') return `${lead}；世界各地：${tail}。`;
  if (L === 'ja') return `${lead}。世界各地：${tail}。`;
  return `${lead}. Around the world: ${tail}.`;
}