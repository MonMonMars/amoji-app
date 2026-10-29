// Keyless live facts for the production chat API.
// The static demo fetches the same sources in the browser (apps/web/lib/live-tools.ts).
// This copy runs on Node, where Google News RSS is readable and Wikipedia is the
// fallback the browser uses when Google blocks CORS.
//
// Endpoints (no key):
//   weather   https://api.open-meteo.com/v1/forecast
//   geocode   https://geocoding-api.open-meteo.com/v1/search
//   "here"    https://get.geojs.io/v1/ip/geo.json  (or /v1/ip/geo/{ip}.json)
//   local news  https://news.google.com/rss/search
//   latest news https://news.google.com/rss  and
//               https://{lang}.wikipedia.org/api/rest_v1/feed/featured/YYYY/MM/DD
// Optional: BRAVE_SEARCH_API_KEY is not read here. Web search on this path is
// Wikipedia + DuckDuckGo. Set a model key (GEMINI_API_KEY and the others in
// server/backend README / root README) only to upgrade the reply model.

export interface LiveFacts { prompt: string; spoken: string }

export interface GatherInput {
  language?: string;
  priorUser?: string;
  clientIp?: string;
  fetch?: typeof fetch;
}

type Lang4 = 'en' | 'yue' | 'zh' | 'ja';

const WEATHER_RE = /\b(weather|forecast|temperature|raining|rain|snow|umbrella|humid)\b|天氣|天气|落雨|下雨|天気|気温/i;
const NEWS_RE = /\b(news|headlines|what's happening|what is happening)\b|新聞|新闻|頭條|头条|ニュース/i;
const RECENT_RE = /\b(?:latest|recent|breaking)\b|\bwhat(?:'s| is) the (?:latest |recent )?(?:news|headlines)\b|最新(?:新聞|新闻|ニュース)|最近(?:嘅)?(?:新聞|新闻)|今日(?:新聞|新闻)/i;
const LOCAL_RE = /\b(?:near me|around here|local)\b|附近|本地|この辺/i;
const WHERE_RE = /\b(where am i|my location)\b|我喺邊|我在哪|どこにいる/i;

function langOf(language: string | undefined): Lang4 {
  if (language === 'en' || language === 'zh' || language === 'ja' || language === 'yue') return language;
  return 'yue';
}

function toolsOff(): boolean {
  const v = (process.env.AMOJI_TOOLS ?? '').trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'off' || v === 'no';
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
}

async function getJson(fetchImpl: typeof fetch, url: string): Promise<unknown | null> {
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'AmojiCompanion/1.0 (+https://github.com/MonMonMars/amoji-app)' },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    return await res.json() as unknown;
  } catch {
    return null;
  }
}

async function getText(fetchImpl: typeof fetch, url: string): Promise<string | null> {
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*', 'User-Agent': 'AmojiCompanion/1.0 (+https://github.com/MonMonMars/amoji-app)' },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const body = (await res.text()).trim();
    return body || null;
  } catch {
    return null;
  }
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

interface Place { latitude: number; longitude: number; label: string; coarse: boolean }

async function locateIp(fetchImpl: typeof fetch, ip: string | undefined): Promise<Place | null> {
  const specific = ip && !/^(127\.|10\.|192\.168\.|::1$)/.test(ip)
    ? await getJson(fetchImpl, `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`)
    : null;
  const data = specific ?? await getJson(fetchImpl, 'https://get.geojs.io/v1/ip/geo.json');
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const latitude = num(d.latitude);
  const longitude = num(d.longitude);
  if (latitude == null || longitude == null) return null;
  const label = [str(d.city), str(d.region), str(d.country)].filter(Boolean).join(', ') || 'your area';
  return { latitude, longitude, label, coarse: true };
}

async function geocode(fetchImpl: typeof fetch, name: string): Promise<Place | null> {
  const data = await getJson(fetchImpl, `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
  const hit = (data as { results?: Array<Record<string, unknown>> } | null)?.results?.[0];
  if (!hit) return null;
  const latitude = num(hit.latitude);
  const longitude = num(hit.longitude);
  if (latitude == null || longitude == null) return null;
  const label = [str(hit.name) || name, str(hit.admin1), str(hit.country)].filter(Boolean).join(', ');
  return { latitude, longitude, label, coarse: false };
}

function namedPlace(text: string): string | undefined {
  const m = text.match(/\b(?:weather|forecast|news|headlines)\s+(?:in|at|for|near)\s+([A-Za-z][A-Za-z .'-]{1,40})/i)
    ?? text.match(/([\u4e00-\u9fff]{2,8})(?:的|嘅)?(?:天氣|天气|新聞|新闻)/);
  const raw = m?.[1]?.replace(/\b(today|now|please)\b/ig, '').trim();
  if (!raw || raw.length > 40) return undefined;
  if (/^(what|whats|the|a|here|there|me)$/i.test(raw)) return undefined;
  return raw;
}

async function weatherLine(fetchImpl: typeof fetch, place: Place): Promise<string | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const data = await getJson(fetchImpl, url);
  const current = (data as { current?: Record<string, unknown> } | null)?.current;
  const temp = num(current?.temperature_2m);
  if (temp == null) return null;
  return `${Math.round(temp)}°C`;
}

const GRIM_RE = /\b(murder|killed|killing|kills|shooting|robbery|suicide)\b|自殺|死亡|凶杀|殺害/i;

function rssTitles(xml: string): string[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const out: string[] = [];
  for (const item of items) {
    const m = item.match(/<title>([\s\S]*?)<\/title>/i);
    if (!m?.[1]) continue;
    const raw = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const cut = raw.lastIndexOf(' - ');
    const title = (cut > 0 ? raw.slice(0, cut) : raw).trim();
    if (!title || /^google news$/i.test(title) || GRIM_RE.test(title)) continue;
    out.push(title);
    if (out.length >= 3) break;
  }
  return out;
}

function wikiHosts(lang: Lang4): string[] {
  if (lang === 'ja') return ['ja.wikipedia.org', 'en.wikipedia.org'];
  if (lang === 'zh' || lang === 'yue') return ['zh.wikipedia.org', 'en.wikipedia.org'];
  return ['en.wikipedia.org'];
}

function utcStamp(offsetDays: number): string {
  const d = new Date(Date.now() - offsetDays * 86_400_000);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}/${m}/${day}`;
}

async function wikipediaNews(fetchImpl: typeof fetch, lang: Lang4): Promise<string[]> {
  for (const host of wikiHosts(lang)) {
    for (const offset of [0, 1]) {
      const data = await getJson(fetchImpl, `https://${host}/api/rest_v1/feed/featured/${utcStamp(offset)}`);
      const news = (data as { news?: Array<{ story?: unknown }> } | null)?.news;
      if (!Array.isArray(news)) continue;
      const titles = news.map((item) => str(item.story).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && !GRIM_RE.test(t))
        .slice(0, 3);
      if (titles.length) return titles;
    }
  }
  return [];
}

async function googleNews(fetchImpl: typeof fetch, query: string, lang: Lang4, top: boolean): Promise<string[]> {
  const pack = {
    en: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
    zh: { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh-Hans' },
    yue: { hl: 'zh-HK', gl: 'HK', ceid: 'HK:zh-Hant' },
    ja: { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  }[lang];
  const q = new URLSearchParams({ hl: pack.hl, gl: pack.gl, ceid: pack.ceid });
  if (!top) q.set('q', query);
  const url = top ? `https://news.google.com/rss?${q.toString()}` : `https://news.google.com/rss/search?${q.toString()}`;
  const xml = await getText(fetchImpl, url);
  if (!xml || !xml.includes('<item')) return [];
  return rssTitles(xml);
}

function sayWeather(lang: Lang4, label: string, temp: string, coarse: boolean): string {
  const n = temp.replace('°C', '');
  if (lang === 'en') return `It's about ${n}° in ${label} right now.${coarse ? ' This is a rough network guess, not a precise spot.' : ''}`;
  if (lang === 'zh') return `${label}这会儿大约${n}度。${coarse ? '这是网络估计的位置，不是精确定位。' : ''}`;
  if (lang === 'ja') return `${label}は今だいたい${n}度。${coarse ? 'ネットからの大まかな位置だよ。' : ''}`;
  return `${label}而家大約${n}度。${coarse ? '呢個係網絡估計嘅位置，唔係精確定位。' : ''}`;
}

function sayRecent(lang: Lang4, title: string): string {
  const t = clip(title, 80);
  if (lang === 'en') return `Here's something from the news: “${t}.”`;
  if (lang === 'zh') return `最近有条新闻：「${t}」。`;
  if (lang === 'ja') return `最近のニュースは「${t}」だよ。`;
  return `最近有條新聞：「${t}」。`;
}

/** Fetch weather and/or headlines when the message asks. Empty for small talk. */
export async function gatherChatWorld(message: string, input: GatherInput = {}): Promise<LiveFacts> {
  if (toolsOff()) return { prompt: '', spoken: '' };
  const follow = /^(and\b|what about\b|how about\b|tomorrow\b|今晚|聽日|明天)/i.test(message.trim());
  const text = follow && input.priorUser ? `${input.priorUser}\n${message}` : message;
  const weather = WEATHER_RE.test(text);
  const news = NEWS_RE.test(text);
  const where = WHERE_RE.test(text);
  if (!weather && !news && !where) return { prompt: '', spoken: '' };
  const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis);
  const lang = langOf(input.language);
  const placeName = namedPlace(text);
  const recent = news && RECENT_RE.test(text) && !LOCAL_RE.test(text);
  let place: Place | null = null;
  if (placeName) place = await geocode(fetchImpl, placeName);
  if (!place && (weather || where || (news && !recent))) place = await locateIp(fetchImpl, input.clientIp);

  const lines: string[] = [];
  const spoken: string[] = [];
  if (place) lines.push(`Place: ${place.label} (${place.coarse ? 'coarse network estimate, not a precise fix' : 'the place they named'}).`);
  if (weather) {
    const temp = place ? await weatherLine(fetchImpl, place) : null;
    if (temp && place) {
      lines.push(`Weather: ${temp}.`);
      spoken.push(sayWeather(lang, place.label, temp, place.coarse));
    } else {
      lines.push('Weather: unavailable right now.');
    }
  }
  if (news) {
    const localQuery = place && !recent ? `${place.label.split(',')[0] ?? place.label} (funny OR weird OR quirky OR heartwarming)` : '';
    const google = await googleNews(fetchImpl, recent || !localQuery ? '' : localQuery, lang, recent || !localQuery);
    const wiki = google.length ? [] : await wikipediaNews(fetchImpl, lang);
    const title = google[0] ?? wiki[0];
    if (title) {
      lines.push(`Recent news: “${clip(title, 180)}” (${google.length ? 'Google News' : 'Wikipedia'}).`);
      spoken.push(sayRecent(lang, title));
    } else {
      lines.push('News: unavailable right now.');
    }
  }
  return {
    prompt: lines.join('\n').slice(0, 900),
    spoken: spoken.slice(0, 2).join(lang === 'en' ? ' ' : ''),
  };
}
