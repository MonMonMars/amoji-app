// Everyday lifestyle lookups for the companion.
// Planned only when the message asks. Ordinary chat never calls these.
//
// No secrets:
//   restaurants / cafes / parks / things to do
//     https://photon.komoot.io/api/  (OpenStreetMap, CORS-open, no key)
//   recipes
//     https://www.themealdb.com/api/json/v1/1/search.php
//     The "1" in the path is TheMealDB's published test key, not a private secret.
//     If that misses, a short Wikipedia intro is the fallback.
//   hobbies / facts / light tutoring
//     handled by the existing Wikipedia + DuckDuckGo search lane.

export type PlaceKind = 'restaurant' | 'cafe' | 'park' | 'fun';
export type Lang4 = 'en' | 'yue' | 'zh' | 'ja';

export interface LifestylePlan {
  places: boolean;
  placeKind: PlaceKind;
  cuisine?: string;
  /** city or area the user named */
  placeQuery?: string;
  recipeQuery?: string;
  learnQuery?: string;
  /** true when a venue search needs "here" and no city was named */
  needsHere: boolean;
}

export interface LifestylePlace {
  latitude: number;
  longitude: number;
  label: string;
  coarse: boolean;
}

export interface LifestyleBits {
  lines: string[];
  spoken: string[];
}

const EMPTY: LifestylePlan = { places: false, placeKind: 'restaurant', needsHere: false };

const CUISINES = [
  'ramen', 'sushi', 'pizza', 'italian', 'chinese', 'thai', 'indian', 'mexican',
  'korean', 'burger', 'noodles', 'noodle', 'dim sum', 'hotpot', 'hot pot',
  'vegetarian', 'vegan', 'seafood', 'bbq', 'dumpling',
] as const;

const CUISINE_RE = new RegExp(`\\b(${CUISINES.join('|')})\\b|拉麵|拉面|壽司|寿司|火鍋|火锅|披薩|披萨|點心|点心|餃子|饺子`, 'i');
const CJK_CUISINE: Record<string, string> = {
  拉麵: 'ramen', 拉面: 'ramen', 壽司: 'sushi', 寿司: 'sushi', 火鍋: 'hotpot', 火锅: 'hotpot',
  披薩: 'pizza', 披萨: 'pizza', 點心: 'dim sum', 点心: 'dim sum', 餃子: 'dumpling', 饺子: 'dumpling',
};

const EAT_RE = /\b(restaurants?|eatery|eateries|where (?:can|should|do) (?:i|we) eat|somewhere to eat|place to eat|food near|grab a bite|dinner spot|lunch spot|brunch spot)\b|餐廳|餐馆|飯店|饭店|吃饭|食飯|食饭|レストラン|ご飯屋|好吃的店/i;
const CAFE_RE = /\b(cafes?|coffee shops?)\b|咖啡廳|咖啡厅|咖啡馆|喫茶/i;
const PARK_RE = /\b(parks?|a walk outside|somewhere to walk)\b|公園|公园|散步/i;
const FUN_RE = /\b(things to do|what should we do|museum|somewhere fun|day out|date idea)\b|好去處|好去处|去邊玩|去哪玩|博物館|博物馆/i;
const NEAR_RE = /\b(near me|nearby|around here|in my (?:area|city)|local)\b|附近|呢度|这里|这儿|この辺|近く/i;
const RECOMMEND_RE = /\b(recommend|suggestion|best|good)\b|推薦|推荐|介紹|介绍/i;

const RECIPE_WORD_RE = /\b(recipes?|cook(?:ing)?|bake(?:d|ing)?)\b|食譜|食谱|點煮|点煮|怎么煮|怎麼煮|如何煮|料理|レシピ/i;
const HOW_MAKE_RE = /\bhow (?:do i|to|can i) (?:make|cook|bake|prepare)\b/i;
const NOT_FOOD_RE = /\b(friends?|money|sense|a living|it work|time|the bed|plans?)\b/i;

const LEARN_RE = /\b(teach me|help me learn|how do i|how to|explain|get started with|tutorial|hobby|hobbies)\b|教我|點樣學|点样学|怎么学|怎麼學|教えて|趣味|愛好|爱好/i;
const ABOUT_YOU_RE = /\b(you|your|yourself)\b|你/;

const PLACE_IN_RE = /\b(?:in|at|near|around)\s+([A-Za-z][A-Za-z .'-]{1,40})/i;
const CJK_PLACE_RE = /([\u4e00-\u9fff]{2,8})(?:的|嘅)?(?:餐廳|餐馆|饭店|拉麵|拉面|咖啡|公園|公园)/;

const DEICTIC = /^(here|there|nearby|near me|around here|me|us|home|local|the area|附近|呢度|这里|这儿|ここ|近く)$/i;
const PLACE_STOP = /^(the|a|an|my|our|your|some|any|this|that|best|good|a good)$/i;

export function isCuisineName(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return (CUISINES as readonly string[]).includes(s) || s in CJK_CUISINE || Boolean(CJK_CUISINE[raw.trim()]);
}

function cuisineOf(text: string): string | undefined {
  const m = text.match(CUISINE_RE);
  if (!m) return;
  const hit = (m[1] ?? m[0]).trim();
  return CJK_CUISINE[hit] ?? hit.toLowerCase();
}

function cleanSpot(raw: string | undefined): string | undefined {
  if (!raw) return;
  let s = raw.replace(/[?？!！。.,，]+$/g, '').trim();
  s = s.replace(/\b(right now|today|tonight|please|today)\b/ig, '').trim();
  s = s.replace(/\s+/g, ' ').trim();
  if (!s || s.length > 40 || DEICTIC.test(s) || PLACE_STOP.test(s)) return;
  if (isCuisineName(s)) return;
  if (/^(what|whats|how|when|where|who|why|is|the|a|an|for|near|me|my)$/i.test(s)) return;
  return s;
}

function namedPlace(text: string): string | undefined {
  const m = text.match(PLACE_IN_RE) ?? text.match(CJK_PLACE_RE);
  return cleanSpot(m?.[1]);
}

function recipeDish(text: string): string | undefined {
  const patterns = [
    /\b(?:recipe for|how (?:do i|to|can i) (?:make|cook|bake|prepare))\s+(.{2,60})/i,
    /\b(?:cook|bake|cooking)\s+(.{2,40})/i,
    /(.{2,40})\s+recipes?\b/i,
    /(?:食譜|食谱|點煮|点煮|怎么煮|怎麼煮|レシピ)[:：\s]*([^\s?？]{1,30})/,
    /教我(?:煮|做)(.{1,20})/,
  ];
  for (const re of patterns) {
    const hit = patternsMatch(text, re);
    if (hit) return hit;
  }
  return;
}

function patternsMatch(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  let s = (m?.[1] ?? '').replace(/[?？!！。]+$/g, '').replace(/\b(please|for me|tonight|today)\b/ig, '').trim();
  s = s.replace(/^(a|an|some|the)\s+/i, '').trim();
  if (s.length < 2 || s.length > 60) return;
  if (NOT_FOOD_RE.test(s) && !RECIPE_WORD_RE.test(text)) return;
  return s;
}

function learnTopic(text: string): string | undefined {
  const m = text.match(/\b(?:teach me(?: about| how to)?|help me learn|how do i|how to|explain|get started with)\s+(.{3,80})/i)
    ?? text.match(/(?:教我|點樣學|点样学|怎么学|怎麼學|教えて)\s*(.{2,40})/);
  let s = (m?.[1] ?? '').replace(/[?？!！。]+$/g, '').trim();
  if (!s && /\bhobb(?:y|ies)\b|趣味|愛好|爱好/.test(text)) s = 'beginner hobbies';
  if (s.length < 3 || s.length > 80) return;
  if (ABOUT_YOU_RE.test(s) && s.split(/\s+/).length < 4) return;
  return s;
}

/** What everyday lookup this message wants. Empty for small talk. */
export function planLifestyle(text: string): LifestylePlan {
  const foodMake = HOW_MAKE_RE.test(text) && !NOT_FOOD_RE.test(text);
  const recipe = (RECIPE_WORD_RE.test(text) || foodMake) && !NOT_FOOD_RE.test(text);
  if (recipe) {
    const recipeQuery = recipeDish(text) ?? cuisineOf(text);
    if (recipeQuery) return { ...EMPTY, recipeQuery };
  }

  const cuisine = cuisineOf(text);
  const placeQuery = namedPlace(text);
  const near = NEAR_RE.test(text);
  const recommend = RECOMMEND_RE.test(text);
  let placeKind: PlaceKind = 'restaurant';
  let places = false;
  if (CAFE_RE.test(text)) { places = true; placeKind = 'cafe'; }
  else if (PARK_RE.test(text)) { places = true; placeKind = 'park'; }
  else if (FUN_RE.test(text)) { places = true; placeKind = 'fun'; }
  else if (EAT_RE.test(text) || (cuisine && (near || recommend || Boolean(placeQuery)))) {
    places = true;
    placeKind = 'restaurant';
  }
  if (places) {
    return {
      places: true,
      placeKind,
      needsHere: !placeQuery,
      ...(cuisine ? { cuisine } : {}),
      ...(placeQuery ? { placeQuery } : {}),
    };
  }

  if (LEARN_RE.test(text)) {
    const learnQuery = learnTopic(text);
    if (learnQuery && !/\b(weather|forecast|news)\b|天氣|天气|新聞|新闻/.test(learnQuery)) {
      return { ...EMPTY, learnQuery };
    }
  }
  return EMPTY;
}

interface Cache { get(url: string): string | undefined; set(url: string, body: string): void }

function memoryCache(cache: Map<string, { at: number; body: string }>): Cache {
  return {
    get(url) {
      const hit = cache.get(url);
      if (!hit || Date.now() - hit.at > 10 * 60 * 1000) return;
      return hit.body;
    },
    set(url, body) { cache.set(url, { at: Date.now(), body }); },
  };
}

async function getJson(fetchImpl: typeof fetch, url: string, cache: Cache): Promise<unknown | null> {
  const hit = cache.get(url);
  if (hit) {
    try { return JSON.parse(hit) as unknown; } catch { return null; }
  }
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (typeof window === 'undefined') headers['User-Agent'] = 'AmojiCompanion/1.0 (+https://github.com/MonMonMars/amoji-app)';
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const body = (await res.text()).trim();
    if (!body) return null;
    cache.set(url, body);
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  const base = (sp > 40 ? cut.slice(0, sp) : cut).replace(/[,:;\-–—]+$/g, '').trim();
  return /[.!?。]$/.test(base) ? base : `${base}.`;
}

const KIND_QUERY: Record<PlaceKind, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  park: 'park',
  fun: 'museum',
};

const KIND_OK: Record<PlaceKind, string[]> = {
  restaurant: ['restaurant', 'fast_food', 'cafe', 'bar', 'food_court'],
  cafe: ['cafe', 'restaurant'],
  park: ['park', 'garden', 'playground', 'nature_reserve'],
  fun: ['museum', 'attraction', 'gallery', 'viewpoint', 'theme_park', 'artwork'],
};

interface Venue { name: string; kind: string; where: string }

async function fetchVenues(
  fetchImpl: typeof fetch,
  place: LifestylePlace,
  kind: PlaceKind,
  cuisine: string | undefined,
  cache: Cache,
): Promise<Venue[]> {
  const q = cuisine || KIND_QUERY[kind];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${place.latitude}&lon=${place.longitude}&limit=8`;
  const data = await getJson(fetchImpl, url, cache);
  const features = (data as { features?: Array<{ properties?: Record<string, unknown> }> } | null)?.features ?? [];
  const wanted = new Set(KIND_OK[kind]);
  const out: Venue[] = [];
  const seen = new Set<string>();
  const push = (venue: Venue, strict: boolean) => {
    const key = venue.name.toLowerCase();
    if (seen.has(key)) return;
    if (strict && venue.kind && !wanted.has(venue.kind)) return;
    seen.add(key);
    out.push(venue);
  };
  const parsed = features.map((f) => {
    const p = f.properties ?? {};
    const name = str(p.name);
    const kindTag = str(p.osm_value);
    const where = [str(p.street), str(p.city) || str(p.state)].filter(Boolean).join(', ');
    return { name, kind: kindTag, where };
  }).filter((v) => v.name);
  for (const v of parsed) push(v, true);
  if (out.length < 2) for (const v of parsed) push(v, false);
  return out.slice(0, 3);
}

interface RecipeCard { title: string; ingredients: string[]; steps: string[] }

function stepsOf(instructions: string): string[] {
  const raw = instructions.replace(/\r/g, '\n').trim();
  const parts = raw.split(/\n+/).flatMap((line) => {
    const t = line.replace(/^\d+[\).\s]+/, '').trim();
    if (!t) return [];
    if (t.length <= 180) return [t];
    return t.split(/(?<=[.!?。])\s+/).map((s) => s.trim()).filter(Boolean);
  }).filter((s) => s.length > 8);
  return parts.slice(0, 6).map((s) => clip(s, 180));
}

function fromMeal(meal: Record<string, unknown>): RecipeCard | null {
  const title = str(meal.strMeal);
  const instructions = str(meal.strInstructions);
  if (!title || !instructions) return null;
  const ingredients: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const name = str(meal[`strIngredient${i}`]);
    const measure = str(meal[`strMeasure${i}`]);
    if (!name) continue;
    ingredients.push(measure ? `${measure} ${name}` : name);
  }
  const steps = stepsOf(instructions);
  if (!steps.length) return null;
  return { title, ingredients, steps };
}

async function fetchMeal(fetchImpl: typeof fetch, dish: string, cache: Cache): Promise<RecipeCard | null> {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(dish)}`;
  const data = await getJson(fetchImpl, url, cache);
  const meals = (data as { meals?: Array<Record<string, unknown>> | null } | null)?.meals;
  const meal = meals?.[0];
  if (!meal) return null;
  return fromMeal(meal);
}

function wikiHost(lang: Lang4): string {
  if (lang === 'zh' || lang === 'yue') return 'zh.wikipedia.org';
  if (lang === 'ja') return 'ja.wikipedia.org';
  return 'en.wikipedia.org';
}

async function fetchWikiRecipe(fetchImpl: typeof fetch, dish: string, lang: Lang4, cache: Cache): Promise<RecipeCard | null> {
  const params = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `${dish} recipe`, gsrlimit: '1',
    prop: 'extracts', exintro: '1', explaintext: '1', exchars: '700', format: 'json', origin: '*',
  });
  const data = await getJson(fetchImpl, `https://${wikiHost(lang)}/w/api.php?${params.toString()}`, cache);
  const pages = (data as { query?: { pages?: Record<string, { title?: string; extract?: string }> } } | null)?.query?.pages;
  const page = pages ? Object.values(pages)[0] : undefined;
  if (!page?.extract || !page.title) return null;
  const steps = stepsOf(page.extract).slice(0, 4);
  if (!steps.length) return null;
  return { title: page.title, ingredients: [], steps };
}

function sayPlaces(lang: Lang4, label: string, venues: Venue[], coarse: boolean): string {
  const a = venues[0];
  const b = venues[1];
  if (!a) return '';
  const spot = a.where ? `${a.name} (${a.where})` : a.name;
  const rough = coarse
    ? (lang === 'en' ? ' This area is a rough guess, not a precise spot.' : lang === 'zh' ? '这个位置是大概估计。' : lang === 'ja' ? 'この場所は大まかな推定だよ。' : '呢個位置係大概估計。')
    : '';
  if (lang === 'zh') {
    const extra = b ? `，${b.name}也在附近` : '';
    return `${label}附近可以去${spot}${extra}。想听另一家吗？${rough}`;
  }
  if (lang === 'ja') {
    const extra = b ? `、${b.name}も近いよ` : '';
    return `${label}の近くなら${spot}${extra}。もう一軒聞く？${rough}`;
  }
  if (lang === 'yue') {
    const extra = b ? `，${b.name}都喺附近` : '';
    return `${label}附近可以去${spot}${extra}。想聽另一間嗎？${rough}`;
  }
  const extra = b ? `, and ${b.name} is close by` : '';
  return `Near ${label}, ${spot} looks like a warm spot${extra}.${rough} Which one sounds good?`;
}

function sayRecipe(lang: Lang4, card: RecipeCard): string {
  const first = card.steps[0] ?? '';
  if (lang === 'zh') return `我们一起做${card.title}。第一步：${first} 准备好下一步了吗？`;
  if (lang === 'ja') return `一緒に${card.title}を作ろう。最初は、${first} 次に進む？`;
  if (lang === 'yue') return `我哋一齊整${card.title}。第一步：${first} 準備好下一步未？`;
  return `Let's cook ${card.title} together. First: ${first} Ready for the next step?`;
}

function sayMiss(lang: Lang4, kind: 'places' | 'recipe'): string {
  if (kind === 'recipe') {
    if (lang === 'zh') return '我这会儿找不到这个做法。';
    if (lang === 'ja') return 'いまそのレシピが見つからなかった。';
    if (lang === 'yue') return '我而家搵唔到呢個做法。';
    return "I couldn't find that recipe just now.";
  }
  if (lang === 'zh') return '我这会儿找不到合适的店。想说一个城市或者口味吗？';
  if (lang === 'ja') return 'いま良さそうなお店が見つからなかった。街か好みを教えて。';
  if (lang === 'yue') return '我而家搵唔到合適嘅店。講個城市或者口味？';
  return "I couldn't find a place nearby just now. Want to name a city or a cuisine?";
}

/** Fetch restaurants, similar places, or a cook-along recipe. */
export async function loadLifestyle(args: {
  plan: LifestylePlan;
  place: LifestylePlace | null;
  lang: Lang4;
  fetch: typeof fetch;
  cache: Map<string, { at: number; body: string }>;
}): Promise<LifestyleBits> {
  if (!args.plan.places && !args.plan.recipeQuery) return { lines: [], spoken: [] };
  const cache = memoryCache(args.cache);
  const lines: string[] = [];
  const spoken: string[] = [];
  const lang = args.lang;

  if (args.plan.places) {
    const venues = args.place
      ? await fetchVenues(args.fetch, args.place, args.plan.placeKind, args.plan.cuisine, cache)
      : [];
    if (venues.length && args.place) {
      const listed = venues.map((v) => {
        const detail = [v.kind, v.where].filter(Boolean).join(', ');
        return detail ? `“${v.name}” (${detail})` : `“${v.name}”`;
      }).join('; ');
      const kindWord = args.plan.placeKind === 'restaurant' ? 'Places' : args.plan.placeKind === 'cafe' ? 'Cafes' : args.plan.placeKind === 'park' ? 'Parks' : 'Outings';
      lines.push(`${kindWord} near ${args.place.label}: ${listed}.`);
      spoken.push(sayPlaces(lang, args.place.label, venues, args.place.coarse));
    } else {
      lines.push('Places: unavailable right now.');
      spoken.push(sayMiss(lang, 'places'));
    }
  }

  if (args.plan.recipeQuery) {
    const card = await fetchMeal(args.fetch, args.plan.recipeQuery, cache)
      ?? await fetchWikiRecipe(args.fetch, args.plan.recipeQuery, lang, cache);
    if (card) {
      const ingredients = card.ingredients.length ? `Ingredients: ${card.ingredients.join(', ')}.` : '';
      const steps = card.steps.map((s, i) => `${i + 1}. ${s}`).join(' ');
      lines.push(`Recipe: ${card.title}. ${ingredients} Steps: ${steps}`.replace(/\s+/g, ' ').trim());
      spoken.push(sayRecipe(lang, card));
    } else {
      lines.push('Recipe: unavailable right now.');
      spoken.push(sayMiss(lang, 'recipe'));
    }
  }

  return { lines, spoken };
}
