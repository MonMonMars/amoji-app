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

const EXTRA_LABELS: Record<string, Record<Lang, string>> = {
  'Asia/Singapore': { yue: '新加坡', zh: '新加坡', ja: 'シンガポール', en: 'Singapore' },
  'Asia/Seoul': { yue: '首爾', zh: '首尔', ja: 'ソウル', en: 'Seoul' },
  'Asia/Taipei': { yue: '台北', zh: '台北', ja: '台北', en: 'Taipei' },
  'Europe/Paris': { yue: '巴黎', zh: '巴黎', ja: 'パリ', en: 'Paris' },
  'Europe/Berlin': { yue: '柏林', zh: '柏林', ja: 'ベルリン', en: 'Berlin' },
};

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

/**
 * Machine clock string for one zone (e.g. `00:31`) — for on-screen/diagnostic use.
 * NEVER feed this to speech: TTS reads the colon as a separator ("zero thirty-one").
 * Speech goes through `spokenClockInZone` / `spokenWorldClock` below.
 */
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
  const extra = EXTRA_LABELS[timeZone];
  if (extra) return extra[lang];
  try {
    const parts = timeZone.split('/');
    const tail = parts[parts.length - 1] ?? timeZone;
    return tail.replace(/_/g, ' ');
  } catch {
    return timeZone;
  }
}

// ---------------------------------------------------------------------------
// Spoken clock
// ---------------------------------------------------------------------------

const WEEKDAYS: Record<Lang, readonly string[]> = {
  yue: ['禮拜日', '禮拜一', '禮拜二', '禮拜三', '禮拜四', '禮拜五', '禮拜六'],
  zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Part-of-day words in the order of `partIndex` below. */
const PART_WORDS: Record<Lang, readonly string[]> = {
  yue: ['凌晨', '朝早', '上午', '中午', '下晝', '傍晚', '夜晚'],
  zh: ['凌晨', '早上', '上午', '中午', '下午', '傍晚', '晚上'],
  ja: ['未明', '朝', '午前', '正午', '午後', '夕方', '夜'],
  en: [
    'in the early hours',
    'in the morning',
    'in the late morning',
    'at midday',
    'in the afternoon',
    'in the early evening',
    'in the evening',
  ],
};

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

function cnNumber(n: number): string {
  if (n < 10) return CN_DIGITS[n] ?? String(n);
  if (n < 20) return n === 10 ? '十' : `十${CN_DIGITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`;
}

function enNumber(n: number): string {
  if (n < 20) return EN_ONES[n] ?? String(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${EN_TENS[tens]}${ones ? `-${EN_ONES[ones]}` : ''}`;
}

function partIndex(hour: number): number {
  if (hour < 5) return 0; // 凌晨 / 未明 / early hours
  if (hour < 8) return 1; // 朝早 / 朝 / morning
  if (hour < 12) return 2; // 上午 / 午前 / late morning
  if (hour < 14) return 3; // 中午 / 正午 / midday
  if (hour < 18) return 4; // 下晝 / 午後 / afternoon
  if (hour < 20) return 5; // 傍晚 / 夕方 / early evening
  return 6; // 夜晚 / 夜 / evening
}

function hour12(hour: number): number {
  const h = hour % 12;
  return h === 0 ? 12 : h;
}

/**
 * Round a wall-clock minute to a 5-minute mark for speech.
 * Minutes 0–3 past a mark stay on it (00:31 and 16:33 both read as "half past"),
 * 4+ roll forward. Never moves speech by more than 4 minutes.
 */
function roundMinuteToFive(minute: number): number {
  const down = Math.floor(minute / 5) * 5;
  return minute - down >= 4 ? down + 5 : down;
}

type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Calendar + clock fields for a zone, read with stable numeric (`en-CA`) parts. */
function wallPartsInZone(timeZone: string, at: Date): WallParts | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(at);
    const pick = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((p) => p.type === type)?.value);
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    if (![year, month, day].every(Number.isFinite)) return null;
    return { year, month, day, hour: pick('hour'), minute: pick('minute') };
  } catch {
    return null;
  }
}

/** Instant shifted so the zone's minute lands on a 5-minute mark (handles day rollover). */
function roundedInstantInZone(timeZone: string, at: Date): Date {
  const wall = wallPartsInZone(timeZone, at);
  if (!wall) return at;
  const rounded = roundMinuteToFive(wall.minute);
  if (rounded === wall.minute) return at;
  return new Date(at.getTime() + (rounded - wall.minute) * 60_000);
}

function daySerial(wall: WallParts): number {
  return Math.round(Date.UTC(wall.year, wall.month - 1, wall.day) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. Serial 0 (1970-01-01) was a Thursday. */
function weekdayIndex(serial: number): number {
  return (((serial + 4) % 7) + 7) % 7;
}

function cnClock(lang: 'yue' | 'zh', hour: number, minute: number): string {
  // Midnight reads as 午夜 (owner phrasing); 1–4am is 凌晨.
  const part = hour === 0 ? '午夜' : (PART_WORDS[lang][partIndex(hour)] ?? '');
  const dian = lang === 'yue' ? '點' : '点';
  const h = cnNumber(hour12(hour));
  let core: string;
  if (minute === 0) core = `${h}${dian}`;
  else if (minute === 15) core = `${h}${dian}一刻`;
  else if (minute === 30) core = `${h}${dian}半`;
  else if (minute === 45) core = `${h}${dian}三刻`;
  else core = `${h}${dian}${cnNumber(minute)}分`;
  return `${part}${core}`;
}

function jaClock(hour: number, minute: number): string {
  const part = PART_WORDS.ja[partIndex(hour)] ?? '';
  const h = hour === 0 ? 0 : hour > 12 ? hour - 12 : hour;
  const suffix = minute === 0 ? '' : minute === 30 ? '半' : `${minute}分`;
  return `${part}${h}時${suffix}`;
}

function enRelative(minute: number, current: string, next: string): string {
  if (minute === 0) return `${current} o'clock`;
  if (minute === 15) return `quarter past ${current}`;
  if (minute === 30) return `half past ${current}`;
  if (minute === 45) return `quarter to ${next}`;
  if (minute < 30) return `${enNumber(minute)} past ${current}`;
  return `${enNumber(60 - minute)} to ${next}`;
}

function enClock(hour: number, minute: number): string {
  if (hour === 0) {
    if (minute === 0) return 'midnight';
    return enRelative(minute, 'midnight', 'one');
  }
  if (hour === 12 && minute === 0) return 'midday';
  const current = enNumber(hour12(hour));
  const next = enNumber(hour12(hour + 1));
  const phrase = enRelative(minute, current, next);
  return `${phrase} ${PART_WORDS.en[partIndex(hour)]}`;
}

function spokenClockFromParts(lang: Lang, hour: number, minute: number): string {
  if (lang === 'yue' || lang === 'zh') return cnClock(lang, hour, minute);
  if (lang === 'ja') return jaClock(hour, minute);
  return enClock(hour, minute);
}

/**
 * Spoken clock for one zone: part of day + time rounded to 5 minutes.
 * Never contains a `HH:MM` colon string, so TTS reads it as prose.
 */
export function spokenClockInZone(timeZone: string, lang: Lang, at: Date = new Date()): string {
  const wall = wallPartsInZone(timeZone, roundedInstantInZone(timeZone, at));
  if (!wall) return spokenClockFromParts(lang, at.getHours(), at.getMinutes());
  return spokenClockFromParts(lang, wall.hour, wall.minute);
}

/**
 * One city, phrased like a person: says whether that city is still on an earlier
 * weekday or has already crossed into tomorrow, before giving its time of day.
 */
function cityClause(lang: Lang, timeZone: string, at: Date, userSerial: number): string {
  const label = labelForZone(timeZone, lang);
  const wall = wallPartsInZone(timeZone, roundedInstantInZone(timeZone, at));
  if (!wall) {
    const time = spokenClockInZone(timeZone, lang, at);
    return lang === 'en' ? `${label} is about ${time}` : `${label}${time}`;
  }
  const time = spokenClockFromParts(lang, wall.hour, wall.minute);
  const serial = daySerial(wall);
  const diff = serial - userSerial;
  const weekday = WEEKDAYS[lang][weekdayIndex(serial)] ?? '';

  if (lang === 'yue') {
    if (diff === 0) return `${label}而家係${time}`;
    if (diff > 0) return `${label}已經係${diff === 1 ? '聽日' : '後日'}${time}喇`;
    return `${label}仲係${weekday}${time}`;
  }
  if (lang === 'zh') {
    if (diff === 0) return `${label}现在是${time}`;
    if (diff > 0) return `${label}已经是${diff === 1 ? '明天' : '后天'}${time}了`;
    return `${label}还是${weekday}${time}`;
  }
  if (lang === 'ja') {
    if (diff === 0) return `${label}は今${time}です`;
    if (diff > 0) return `${label}はもう${diff === 1 ? '明日' : '明後日'}の${time}です`;
    return `${label}はまだ${weekday}の${time}です`;
  }
  if (diff === 0) return `${label} is about ${time}`;
  if (diff > 0) {
    return `${label} is already on ${diff === 1 ? 'tomorrow' : 'the day after tomorrow'}, about ${time}`;
  }
  return `${label} is still ${weekday}, about ${time}`;
}

function localLead(lang: Lang, time: string): string {
  if (lang === 'yue') return `你而家大約${time}`;
  if (lang === 'zh') return `你现在大约${time}`;
  if (lang === 'ja') return `あなたのところは今およそ${time}`;
  return `Where you are it's about ${time}`;
}

function joinClauses(lang: Lang, clauses: readonly string[]): string {
  if (!clauses.length) return '';
  if (lang === 'en') {
    if (clauses.length === 1) return clauses[0] ?? '';
    return `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;
  }
  return clauses.join(lang === 'ja' ? '、' : '，');
}

/** How many spoken facets rotate on repeat demo-chip taps. */
export function worldClockFacetCount(): number {
  return 4;
}

/**
 * Spoken world clock for demo chip + showcase — the listener's own time first,
 * then cities phrased as prose (part of day + weekday/day boundary, never `HH:MM`).
 * `facet` rotates which city set is emphasized (repeat taps).
 * `userTimeZone` is overridable so tests do not depend on the machine's zone.
 */
export function spokenWorldClock(
  lang?: string,
  facet = 0,
  at: Date = new Date(),
  userTimeZone?: string,
): string {
  const L = asWorldClockLang(lang);
  const userTz = userTimeZone || resolveUserTimeZone();
  const userWall = wallPartsInZone(userTz, roundedInstantInZone(userTz, at));
  const userSerial = userWall ? daySerial(userWall) : 0;
  const localTime = userWall
    ? spokenClockFromParts(L, userWall.hour, userWall.minute)
    : spokenClockInZone(userTz, L, at);
  const lead = localLead(L, localTime);

  const f = Math.abs(facet) % worldClockFacetCount();

  const zoneClause = (tz: string) => cityClause(L, tz, at, userSerial);
  const finish = (intro: string, zones: readonly string[]): string => {
    const body = joinClauses(L, zones.map(zoneClause));
    if (L === 'en') return `${lead}. ${intro}${body}.`;
    if (L === 'ja') return `${lead}。${intro}${body}。`;
    return `${lead}。${intro}${body}。`;
  };

  const skipHome = (zones: readonly string[]) => zones.filter((tz) => tz !== userTz);

  if (f === 0) {
    return finish('', skipHome(WORLD_CLOCK_TOUR.slice(0, 4).map((c) => c.timeZone)));
  }

  if (f === 1) {
    const asia = skipHome(['Asia/Hong_Kong', 'Asia/Tokyo', ...ASIA_EXTRA]);
    if (L === 'en') return finish('In Asia, ', asia);
    if (L === 'zh') return finish('亚洲一带，', asia);
    if (L === 'ja') return finish('アジアでは、', asia);
    return finish('亞洲一帶，', asia);
  }

  if (f === 2) {
    const west = skipHome([
      'Europe/London',
      ...EURO_EXTRA,
      'America/New_York',
      'America/Los_Angeles',
    ]);
    if (L === 'en') return finish('In Europe and the Americas, ', west);
    if (L === 'zh') return finish('欧美那边，', west);
    if (L === 'ja') return finish('ヨーロッパとアメリカでは、', west);
    return finish('歐美嗰邊，', west);
  }

  const world = skipHome(WORLD_CLOCK_TOUR.map((c) => c.timeZone));
  if (L === 'en') return finish('Around the world, ', world);
  if (L === 'zh') return finish('世界各地，', world);
  if (L === 'ja') return finish('世界各地では、', world);
  return finish('世界各地，', world);
}
