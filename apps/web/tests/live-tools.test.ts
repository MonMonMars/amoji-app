import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLiveCache,
  clearNewsTold,
  clientLiveContext,
  detectWeatherFocus,
  gatherLiveContext,
  invalidateNewsFeedCache,
  isNewsFeedCacheKey,
  isLiveFactsOnlyTurn,
  isHeavyHeadline,
  isJunkNewsHeadline,
  topicalHeadlineMatches,
  liveToolsEnabled,
  newsRegionFromPlace,
  NEWS_LAST_KEY,
  NEWS_TOLD_KEY,
  normalizeNewsTitle,
  parseRssItems,
  pickDefaultHeadlines,
  pickLightHeadlines,
  placeLabel,
  planTools,
  preferLiveReply,
  weatherAccuracyLeak,
  regionalLightNewsFeedUrls,
  regionalNewsFeedUrls,
  portalNewsFeedUrls,
  locationPermissionSettled,
  resolveDevicePlace,
  selectNewsLead,
  newsDetailsFromText,
  newsLocalPlaceLabel,
  newsPackForRegion,
  preferHeadlinesForLang,
  sayNews,
  sayRecent,
  sayTopicalNews,
  isNewsPublishedToday,
  parseNewsPublishedAt,
  scrubNewsFeedBody,
  scrubNewsTitleForSpeech,
  toldNewsTitles,
  worldBlock,
  type GeoLike,
  type Place,
} from '../lib/live-tools';
import { OpenAiLlm } from '../lib/llm';
import { clientChat } from '../lib/client-chat';
import { resetBrainDead } from '../lib/brain';

const HK: Place = {
  latitude: 22.32, longitude: 114.17, city: 'Hong Kong', region: '', country: 'Hong Kong', source: 'browser',
};

const weatherBody = {
  current: {
    temperature_2m: 28.7,
    apparent_temperature: 30.8,
    weather_code: 51,
    wind_speed_10m: 20.7,
    relative_humidity_2m: 66,
  },
  daily: {
    temperature_2m_max: [29.1],
    temperature_2m_min: [25.2],
    precipitation_probability_max: [43],
  },
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function kv(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
}

afterEach(() => {
  clearLiveCache();
  clearNewsTold();
  delete process.env.NEXT_PUBLIC_AMOJI_TOOLS;
  delete process.env.AMOJI_TOOLS;
  resetBrainDead();
});

describe('planTools', () => {
  it('leaves ordinary chat alone', () => {
    for (const text of ['hello', 'how are you?', 'what is your name?', '你叫咩名？', '那你呢']) {
      const plan = planTools(text);
      expect(plan.weather || plan.news || plan.where || plan.places || Boolean(plan.searchQuery) || Boolean(plan.recipeQuery) || Boolean(plan.learnQuery), text).toBe(false);
    }
  });

  it('isLiveFactsOnlyTurn speaks weather and news headlines without a second LLM pass', () => {
    const weather = planTools("what's the weather here?");
    expect(isLiveFactsOnlyTurn(weather, 'It is 22° in Berlin.')).toBe(true);
    expect(isLiveFactsOnlyTurn(weather, '')).toBe(false);
    const news = planTools('what is the latest news?');
    expect(isLiveFactsOnlyTurn(news, 'From the news: Light headline from Wikipedia.')).toBe(true);
    // Exhausted / empty miss must speak as-is — LLM must not invent a headline.
    expect(isLiveFactsOnlyTurn(news, "I couldn't find a headline just now.")).toBe(true);
    expect(isLiveFactsOnlyTurn(news, 'Which city or country should I pull the news for?')).toBe(false);
    const cafe = planTools('cafes near me');
    expect(isLiveFactsOnlyTurn(cafe, 'Two spots nearby.')).toBe(false);
    const learn = planTools('search how photosynthesis works');
    expect(isLiveFactsOnlyTurn(learn, 'Plants use light.')).toBe(false);
  });

  it('plans weather here without treating the question words as a city', () => {
    const plan = planTools("what's the weather here?");
    expect(plan.weather).toBe(true);
    expect(plan.needsDevice).toBe(true);
    expect(plan.placeQuery).toBeUndefined();
    expect(plan.searchQuery).toBeUndefined();
  });

  it('routes explicit “search weather” to Open-Meteo, not web search', () => {
    expect(planTools('search weather').weather).toBe(true);
    expect(planTools('search weather').searchQuery).toBeUndefined();
    expect(planTools('搜索天气').weather).toBe(true);
    expect(planTools('搜索天气').searchQuery).toBeUndefined();
  });

  it('geocodes a named place instead of asking for GPS', () => {
    const plan = planTools('weather in New York today');
    expect(plan.weather).toBe(true);
    expect(plan.placeQuery).toBe('New York');
    expect(plan.needsDevice).toBe(false);
  });

  it('understands Cantonese, Mandarin, and Japanese weather', () => {
    expect(planTools('天氣點呀').needsDevice).toBe(true);
    expect(planTools('天氣點呀').placeQuery).toBeUndefined();
    expect(planTools('香港天氣').placeQuery).toBe('香港');
    expect(planTools('今天天气怎么样').needsDevice).toBe(true);
    expect(planTools('大阪の天気').placeQuery).toBe('大阪');
  });

  it('treats latest news as recent headlines, without a location prompt', () => {
    const plan = planTools('what is the latest news?');
    expect(plan.news).toBe(true);
    expect(plan.recent).toBe(true);
    expect(plan.heavyNews).toBe(false);
    expect(plan.needsDevice).toBe(false);
    expect(plan.searchQuery).toBeUndefined();
    expect(planTools('news near me').recent).toBe(false);
    expect(planTools('news near me').needsDevice).toBe(true);
    // Plain news asks (no near-me) use the recent/world path — never GPS/city ask.
    expect(planTools('新聞').recent).toBe(true);
    expect(planTools('新聞').needsDevice).toBe(false);
    expect(planTools('tell me news').recent).toBe(true);
    expect(planTools('tell me news').needsDevice).toBe(false);
    expect(planTools('讀新聞').recent).toBe(true);
    expect(planTools('讀新聞').needsDevice).toBe(false);
    expect(planTools('any news?').recent).toBe(true);
    expect(planTools('any news?').needsDevice).toBe(false);
    expect(planTools('最近新聞').recent).toBe(true);
    // Demo-phase CJK prompts must not demand GPS just to read headlines.
    expect(planTools('今日有咩新聞？').recent).toBe(true);
    expect(planTools('今日有咩新聞？').needsDevice).toBe(false);
    expect(planTools('今天有什么新闻？').recent).toBe(true);
    expect(planTools('今天有什么新闻？').needsDevice).toBe(false);
  });


  it('reads a news fact line with no trailing question', async () => {
    const live = await gatherLiveContext("what's the latest news?", {
      lang: 'en',
      fetch: async (input) => {
        const url = String(input);
        if (url.includes('news.google.com')) throw new Error('cors');
        if (url.includes('rss2json.com')) return new Response('<html>blocked', { status: 403 });
        if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
          return new Response(
            '<rss><channel><item><title>Scientists find a quirky deep-sea fish near the reef</title></item></channel></rss>',
            { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
          );
        }
        return jsonRes({}, 404);
      },
      cache: new Map(),
      locate: async () => null,
    });
    expect(live.spoken.trim().length).toBeGreaterThan(0);
    expect(live.spoken).toContain('quirky deep-sea fish');
    expect(live.spoken).not.toMatch(/[?？]/);
    expect(live.spoken.toLowerCase()).not.toContain('which city');
    expect(live.spoken.toLowerCase()).not.toContain('which topic');
    expect(preferLiveReply("I don't have live news. Which city?", live.prompt, live.spoken, 'en')).toBe(live.spoken);
    expect(preferLiveReply("I don't have live news. Which city?", live.prompt, live.spoken, 'en')).not.toMatch(/[?？]/);
  });

  it('falls back to recent news for plain tell-me-news without asking city', async () => {
    let located = false;
    const live = await gatherLiveContext('tell me news', {
      lang: 'en',
      fetch: async (input) => {
        const url = String(input);
        if (url.includes('news.google.com')) throw new Error('cors');
        if (url.includes('rss2json.com')) return new Response('<html>blocked', { status: 403 });
        if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
          return new Response(
            '<rss><channel><item><title>Museum cat parade draws a cheerful crowd downtown</title></item></channel></rss>',
            { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
          );
        }
        return jsonRes({}, 404);
      },
      cache: new Map(),
      locate: async () => { located = true; return null; },
    });
    expect(planTools('tell me news').needsDevice).toBe(false);
    // Edition scoping may probe location, but must not ask the user for a city.
    expect(located).toBe(true);
    expect(live.spoken.toLowerCase()).not.toContain('which city');
    expect(live.spoken).not.toMatch(/[?？]/);
    expect(live.spoken.toLowerCase()).toMatch(/museum|cat|parade|crowd|news/i);
  });

  it('does not treat Japanese “today” as a weather city', () => {
    const plan = planTools('今日の天気は？');
    expect(plan.weather).toBe(true);
    expect(plan.placeQuery).toBeUndefined();
    expect(plan.needsDevice).toBe(true);
  });

  it('asks for a city when a bad place name fails to geocode, instead of “couldn’t check”', async () => {
    const live = await gatherLiveContext('weather in Nowhereville Zedland', {
      lang: 'en',
      fetch: async () => jsonRes({ results: [] }),
      cache: new Map(),
      locate: async () => null,
    });
    expect(live.spoken.toLowerCase()).toMatch(/settings|location/);
    expect(live.spoken.toLowerCase()).not.toContain("couldn't check the weather");
  });

  it('plans local news, topical news, and a web lookup separately', () => {
    const local = planTools('news near me');
    expect(local.news).toBe(true);
    expect(local.needsDevice).toBe(true);
    expect(local.newsQuery).toBeUndefined();

    // Soft "local" wording (demo chip) must not force a city ask — serve recent/world.
    const softLocal = planTools('any light local news?');
    expect(softLocal.news).toBe(true);
    expect(softLocal.needsDevice).toBe(false);
    expect(softLocal.recent).toBe(true);
    expect(planTools('any light fun news?').needsDevice).toBe(false);

    expect(planTools("what's the latest AI news?").news).toBe(true);
    expect(planTools("what's the latest AI news?").newsQuery?.toLowerCase()).toMatch(/artificial intelligence/);
    expect(planTools('最新有咩 AI 新聞？').newsQuery?.toLowerCase()).toMatch(/artificial intelligence/);
    const topic = planTools('news about Mars rovers');
    expect(topic.news).toBe(true);
    expect(topic.needsDevice).toBe(false);
    expect(topic.newsQuery?.toLowerCase()).toContain('mars');

    const look = planTools('who is Marie Curie?');
    expect(look.searchQuery?.toLowerCase()).toContain('marie');
    expect(look.weather).toBe(false);
  });

  it('plans restaurants, recipes, and hobby lessons separately from small talk', () => {
    const near = planTools('restaurants near me');
    expect(near.places).toBe(true);
    expect(near.needsDevice).toBe(true);
    expect(near.placeQuery).toBeUndefined();
    expect(near.searchQuery).toBeUndefined();

    const city = planTools('best ramen in Osaka');
    expect(city.places).toBe(true);
    expect(city.placeQuery).toBe('Osaka');
    expect(city.cuisine).toBe('ramen');
    expect(city.needsDevice).toBe(false);

    const cook = planTools('how do I make tomato soup?');
    expect(cook.recipeQuery?.toLowerCase()).toContain('tomato');
    expect(cook.places).toBe(false);
    expect(cook.needsDevice).toBe(false);

    const hobby = planTools('teach me basic guitar');
    expect(hobby.learnQuery?.toLowerCase()).toContain('guitar');
    expect(hobby.searchQuery?.toLowerCase()).toContain('guitar');
    expect(hobby.recipeQuery).toBeUndefined();

    expect(planTools('how do I make friends?').recipeQuery).toBeUndefined();
    expect(planTools('I like pizza').places).toBe(false);

    expect(planTools('咕嚕肉食譜').recipeQuery).toBe('咕嚕肉');
    expect(planTools('咕嚕肉點煮').recipeQuery).toBe('咕嚕肉');
  });

  it('keeps the previous tools on a short follow-up', () => {
    const plan = planTools('what about Osaka?', "what's the weather here?");
    expect(plan.weather).toBe(true);
    expect(plan.placeQuery).toBe('Osaka');
    expect(plan.needsDevice).toBe(false);
  });
});

describe('gatherLiveContext', () => {
  it('does not touch the network for small talk', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return jsonRes({});
    };
    const live = await gatherLiveContext('how are you?', { fetch: fetchImpl, cache: new Map() });
    expect(live).toEqual({ prompt: '', spoken: '' });
    expect(calls).toBe(0);
  });

  it('speaks browser weather in the active language', async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('api.open-meteo.com')) return jsonRes(weatherBody);
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext("what's the weather here?", {
      lang: 'yue',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(live.prompt).toContain('29°C');
    expect(live.prompt).toMatch(/Place:\s*Hong Kong/);
    expect(live.prompt.toLowerCase()).not.toContain('browser location');
    expect(live.spoken).toContain('29度');
    expect(live.spoken).not.toContain('香港'); // no city name in spoken weather
    expect(live.spoken).toContain('落毛毛雨');
    expect(urls.some((u) => u.includes('geojs'))).toBe(false);
    expect(urls.some((u) => u.includes('forecast_days=4'))).toBe(true);
  });

  it('rotates spoken weather facets (temp / wind / forecast)', async () => {
    expect(detectWeatherFocus("what's the temperature right now?")).toBe('temp');
    expect(detectWeatherFocus("how's the wind today?")).toBe('wind');
    expect(detectWeatherFocus("what's the forecast for the next few days?")).toBe('forecast');

    const multiDay = {
      ...weatherBody,
      daily: {
        temperature_2m_max: [29.1, 30.2, 28.0],
        temperature_2m_min: [25.2, 26.0, 24.5],
        precipitation_probability_max: [43, 20, 55],
      },
    };
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes('api.open-meteo.com')) return jsonRes(multiDay);
      return jsonRes({}, 404);
    };
    const wind = await gatherLiveContext("how's the wind today?", {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(wind.spoken.toLowerCase()).toMatch(/wind|km\/h/);
    expect(wind.spoken).toMatch(/21/);
    expect(wind.prompt).toMatch(/wind 21 km\/h/);

    const forecast = await gatherLiveContext("what's the forecast for the next few days?", {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(forecast.prompt).toMatch(/Outlook:/);
    expect(forecast.spoken.toLowerCase()).toMatch(/today|next|day/i);
  });

  it('keeps GPS / accuracy talk out of both weather prompt and spoken line', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes('api.open-meteo.com')) return jsonRes(weatherBody);
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('weather', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => ({ ...HK, city: 'Ashburn', region: 'Virginia', country: 'United States', source: 'ip' }),
    });
    // Place is named without source/accuracy so free LLMs cannot echo GPS talk.
    expect(live.prompt).toMatch(/Place:\s*Ashburn/);
    expect(live.prompt.toLowerCase()).not.toMatch(/gps|coarse network|precise fix|may be wrong|accuracy/);
    expect(live.spoken).toContain('29°');
    expect(live.spoken.toLowerCase()).not.toMatch(/gps|precise|network guess|may be wrong|accuracy|ashburn/);
    expect(live.spoken.toLowerCase()).toMatch(/take care/);
    expect(live.spoken).toMatch(/umbrella|jacket|coat|layer|water|boots/i);
  });

  it('geocodes Osaka and does not ask the device', async () => {
    let located = false;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('geocoding-api.open-meteo.com')) {
        return jsonRes({ results: [{ name: 'Osaka', latitude: 34.69, longitude: 135.5, country: 'Japan', admin1: 'Osaka' }] });
      }
      if (url.includes('api.open-meteo.com')) return jsonRes(weatherBody);
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('weather in Osaka', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => { located = true; return HK; },
    });
    expect(located).toBe(false);
    expect(live.prompt).toContain('Osaka');
    // Spoken weather is degrees + condition + prep — city stays in the prompt only.
    expect(live.spoken).toMatch(/29°/);
    expect(live.spoken).not.toContain('Osaka');
  });

  it('reads local headlines from RSS', async () => {
    const rss = '<rss><channel><item><title>Weird lights over Hong Kong harbour - Daily</title></item><item><title>Accused robber hits Hong Kong bank - Wire</title></item></channel></rss>';
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) return new Response(rss, { status: 200 });
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('news near me', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(live.prompt).toContain('Weird lights over Hong Kong harbour');
    expect(live.prompt).not.toContain('robber');
    expect(live.spoken).toContain('Weird lights');
    expect(live.spoken).not.toContain('{');
  });

  it('reads Yahoo portal RSS when Google and rss2json are blocked', async () => {
    let located = false;
    const yahooRss = '<rss><channel><item><title>A cat wins a funny contest in town - Yahoo</title></item><item><title>A shooting kills several people downtown</title></item></channel></rss>';
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('<html>Just a moment', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.news.yahoo.com')) {
        return new Response(yahooRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      if (url.includes('rss.msn.com')) return new Response('', { status: 404 });
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('what is the latest news?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => { located = true; return HK; },
    });
    expect(located).toBe(true);
    expect(live.prompt).toContain('Light news');
    expect(live.prompt).toContain('funny contest');
    expect(live.prompt.toLowerCase()).not.toContain('shooting');
    expect(live.spoken).toContain('funny contest');
    expect(live.spoken).not.toContain('<');
  });

  it('hands the model only one headline even when several soft stories exist', async () => {
    const yahooRss = `<rss><channel>
      <item><title>A bakery opens a cheerful night market stall</title></item>
      <item><title>Scientists share a quirky AI drawing tip</title></item>
      <item><title>A puppy parade fills the park with smiles</title></item>
    </channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(yahooRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('what is the latest news?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(live.prompt).toMatch(/Light news[^:\n]*:\s*[“"]/);
    expect(live.prompt).not.toContain(';');
    const quoted = [...live.prompt.matchAll(/[“"]([^”"]+)[”"]/g)].map((m) => m[1]);
    expect(quoted.length).toBe(1);
    expect(live.spoken).toMatch(/bakery|Scientists|puppy/i);
  });

  it('tells topical AI news via portal RSS when Google is blocked in the browser', async () => {
    const yahooRss = `<rss><channel>
      <item><title>New artificial intelligence tools help artists paint faster</title></item>
      <item><title>A cat wins a funny contest in town</title></item>
    </channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('<html>blocked', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(yahooRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext("what's the latest AI news?", {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
    });
    expect(live.spoken.toLowerCase()).not.toContain("couldn't find");
    expect(live.spoken).toMatch(/artificial intelligence|artists paint|From the news/i);
    expect(live.spoken).not.toContain('<');
    expect(isLiveFactsOnlyTurn(planTools("what's the latest AI news?"), live.spoken)).toBe(true);
  });

  it('speaks light fun news without asking for a city', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(
          '<rss><channel><item><title>A bakery opens a cheerful night market stall</title></item></channel></rss>',
          { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
        );
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('any light fun news?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => { throw new Error('should not locate'); },
    });
    expect(live.spoken.toLowerCase()).not.toContain('which city');
    expect(live.spoken).toContain('bakery');
  });

  it('falls back to rss2json when Google News blocks the browser', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const host = new URL(String(input)).hostname;
      if (host.includes('news.google.com')) throw new Error('cors');
      if (host.includes('rss2json.com')) {
        return jsonRes({ status: 'ok', items: [{ title: 'Funny night market opens in Hong Kong - Local', author: 'Local' }] });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('新聞', {
      lang: 'zh',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(live.spoken).toContain('Funny night market');
    // Plain 「新聞」 uses the recent/world path (finished statement, no local framing / city ask).
    expect(live.spoken).toMatch(/最近有条新闻/);
    expect(live.spoken).not.toMatch(/[?？]/);
    expect(live.spoken).not.toContain('哪个城市');
  });

  it('answers a general lookup from Wikipedia and DuckDuckGo', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('wikipedia.org')) {
        return jsonRes({ query: { pages: { '1': { index: 1, title: 'Marie Curie', extract: 'Marie Curie was a physicist and chemist.' } } } });
      }
      if (url.includes('duckduckgo.com')) {
        return jsonRes({ Heading: 'Marie Curie', AbstractText: 'Polish-French physicist.', RelatedTopics: [] });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('who is Marie Curie?', { lang: 'en', fetch: fetchImpl, cache: new Map() });
    expect(live.prompt).toContain('physicist');
    expect(live.spoken.startsWith('I looked that up')).toBe(true);
  });

  it('prefers Brave results when a key is configured', async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('api.search.brave.com')) {
        return jsonRes({ web: { results: [{ title: 'UN chief', description: 'The current secretary-general is António Guterres.' }] } });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('who is the UN secretary general?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      braveKey: 'test-key',
    });
    expect(live.prompt).toContain('Guterres');
    expect(urls.some((u) => u.includes('wikipedia'))).toBe(false);
  });

  it('recommends named restaurants from Photon and does not invent a list', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('geocoding-api.open-meteo.com')) {
        return jsonRes({ results: [{ name: 'Osaka', latitude: 34.69, longitude: 135.5, country: 'Japan', admin1: 'Osaka' }] });
      }
      if (url.includes('photon.komoot.io')) {
        return jsonRes({
          features: [
            { properties: { name: 'Noodle House', osm_key: 'amenity', osm_value: 'restaurant', street: 'Dotonbori', city: 'Osaka' } },
            { properties: { name: 'Ramen RPG', osm_key: 'amenity', osm_value: 'restaurant', city: 'Osaka' } },
          ],
        });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('best ramen in Osaka', { lang: 'en', fetch: fetchImpl, cache: new Map() });
    expect(live.prompt).toContain('Noodle House');
    expect(live.prompt).toContain('Ramen RPG');
    expect(live.spoken).toContain('Noodle House');
    expect(live.spoken).not.toMatch(/^\s*[-*]/m);
    expect(live.spoken).toMatch(/\?/);
  });

  it('teaches a recipe as numbered steps', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('themealdb.com')) {
        return jsonRes({
          meals: [{
            strMeal: 'Tomato Soup',
            strInstructions: 'Simmer the tomatoes until soft.\nStir in a pinch of salt and taste.',
            strIngredient1: 'tomatoes',
            strMeasure1: '4',
            strIngredient2: 'salt',
            strMeasure2: '1 pinch',
          }],
        });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('how do I make tomato soup?', { lang: 'en', fetch: fetchImpl, cache: new Map() });
    expect(live.prompt).toContain('Recipe: Tomato Soup');
    expect(live.prompt).toContain('1. Simmer the tomatoes');
    expect(live.prompt).toContain('2. Stir in a pinch of salt');
    expect(live.spoken).toContain('Tomato Soup');
    expect(live.spoken).toContain('Simmer the tomatoes');
    expect(live.spoken).toMatch(/Step 1:|第1步/);
    expect(live.spoken).not.toMatch(/Ready for the next step|準備好下一步/);
  });

  it('looks up a hobby lesson on Wikipedia', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('wikipedia.org')) {
        return jsonRes({ query: { pages: { '1': { index: 1, title: 'Guitar', extract: 'The guitar is a fretted string instrument.' } } } });
      }
      if (url.includes('duckduckgo.com')) return jsonRes({ AbstractText: '', RelatedTopics: [] });
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('teach me basic guitar', { lang: 'en', fetch: fetchImpl, cache: new Map() });
    expect(live.prompt).toContain('Learn:');
    expect(live.prompt).toContain('fretted string');
    expect(live.spoken.toLowerCase()).toContain('guitar');
  });

  it('asks for Settings city or browser location when weather needs a place', async () => {
    const live = await gatherLiveContext('今天天气怎么样', {
      lang: 'zh',
      fetch: async () => jsonRes({}, 404),
      cache: new Map(),
      locate: async () => null,
    });
    expect(live.spoken).toContain('设置');
    expect(live.spoken).toMatch(/城市/);
  });

  it('says so when the weather service is down, instead of inventing a number', async () => {
    const fetchImpl: typeof fetch = async () => jsonRes({}, 503);
    const live = await gatherLiveContext('weather', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    expect(live.prompt).toContain('unavailable');
    expect(live.spoken.toLowerCase()).toContain("couldn't check the weather");
    expect(live.spoken).not.toMatch(/\d+°/);
  });
});

describe('resolveDevicePlace', () => {
  it('uses the browser fix and remembers it', async () => {
    const storage = kv();
    const session = kv();
    let asks = 0;
    const geo: GeoLike = {
      getCurrentPosition(success) {
        asks += 1;
        success({ coords: { latitude: 22.32, longitude: 114.17 } });
      },
    };
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes('bigdatacloud')) {
        return jsonRes({ city: 'Hong Kong', locality: 'Yau Tsim Mong', principalSubdivision: '', countryName: 'Hong Kong' });
      }
      return jsonRes({}, 404);
    };
    const cache = new Map<string, { at: number; body: string }>();
    const first = await resolveDevicePlace({ fetch: fetchImpl, geolocation: geo, storage, session, cache, now: 1_000 });
    expect(first?.source).toBe('browser');
    expect(placeLabel(first!)).toContain('Hong Kong');
    const second = await resolveDevicePlace({ fetch: fetchImpl, geolocation: geo, storage, session, cache, now: 2_000 });
    expect(second?.source).toBe('browser');
    expect(asks).toBe(1);
  });

  it('falls back to a public IP after permission is denied', async () => {
    const session = kv();
    const geo: GeoLike = {
      getCurrentPosition(_success, error) { error?.({ code: 1 }); },
    };
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      expect(url).toContain('8.8.8.8');
      return jsonRes({ city: 'Ashburn', region: 'Virginia', country: 'United States', latitude: '39.04', longitude: '-77.49' });
    };
    const place = await resolveDevicePlace({
      fetch: fetchImpl,
      geolocation: geo,
      storage: kv(),
      session,
      ip: '8.8.8.8',
      cache: new Map(),
      now: 5_000,
    });
    expect(place?.source).toBe('ip');
    expect(place?.city).toBe('Ashburn');
    expect(session.getItem('amoji.geo.denied')).toBe('1');
  });
});

describe('locationPermissionSettled', () => {
  it('treats deny, primed session, or browser cache as settled', () => {
    expect(locationPermissionSettled(kv(), kv())).toBe(false);
    const denied = kv();
    denied.setItem('amoji.geo.denied', '1');
    expect(locationPermissionSettled(kv(), denied)).toBe(true);
    const primed = kv();
    primed.setItem('amoji.geo.primed', '1');
    expect(locationPermissionSettled(kv(), primed)).toBe(true);
    const storage = kv();
    storage.setItem(
      'amoji.place.v1',
      JSON.stringify({ ...HK, at: Date.now() }),
    );
    expect(locationPermissionSettled(storage, kv())).toBe(true);
  });
});

describe('tool switch and prompt wiring', () => {
  it('can be turned off without a rebuild of the planner', async () => {
    process.env.NEXT_PUBLIC_AMOJI_TOOLS = '0';
    expect(liveToolsEnabled()).toBe(false);
    const live = await clientLiveContext("what's the weather here?", 'en');
    expect(live.prompt).toBe('');
  });

  it('worldBlock stays empty unless there are facts', () => {
    expect(worldBlock('')).toBe('');
    expect(worldBlock('Weather: 29°C, drizzling.')).toContain('29°C');
    expect(worldBlock('Weather: 29°C.')).toContain('Do not invent');
    expect(worldBlock('Light news: “Cat parade”')).toMatch(/SIMPLY READ|ONE headline|Never ask which topic/i);
    expect(worldBlock('Recipe: soup.')).toContain('cook-along');
    const weatherGuide = worldBlock('Weather: 29°C.');
    expect(weatherGuide).toMatch(/take care/i);
    expect(weatherGuide).not.toMatch(/precise GPS|coarse network estimate, say it is approximate/i);
  });

  it('sends live facts to the model as system text, not as the user line', async () => {
    const prev = globalThis.fetch;
    let body = '';
    globalThis.fetch = async (_input, init) => {
      body = String(init?.body ?? '');
      return jsonRes({ choices: [{ message: { content: 'It is warm out. [emotion:{"joy":0.4}]' } }] });
    };
    try {
      const llm = new OpenAiLlm('https://example.test/v1', 'k', 'm');
      const r = await llm.chat(
        [{ role: 'user', content: "what's the weather here?" }],
        { language: 'en', world: 'Weather: 29°C, drizzling.' },
      );
      expect(r.reply.toLowerCase()).toContain('warm');
      const parsed = JSON.parse(body) as { messages: Array<{ role: string; content: string }> };
      expect(parsed.messages[0]?.content).toContain('29°C');
      expect(parsed.messages[1]?.content).toBe("what's the weather here?");
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('speaks the live facts when every brain is down', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('offline'); };
    try {
      const r = await clientChat(
        [{ role: 'user', content: "what's the weather here?" }],
        { language: 'yue', worldSpoken: '香港而家大約29度，落毛毛雨。' },
      );
      expect(r.reply).toContain('29度');
      expect(r.reply).not.toMatch(/咁你呢|想唔想講多啲/);
    } finally {
      globalThis.fetch = prev;
    }
  });
});

describe('local light news and reply guard', () => {
  it('never mixes English "here" with Cantonese 附近 in news intros', () => {
    const title = '社區花市週末開張';
    expect(sayNews('yue', 'here', title)).toBe(`附近有條輕鬆本地新聞：${title}。`);
    expect(sayNews('yue', 'here', title)).not.toMatch(/\bhere\b/i);
    expect(sayNews('yue', 'your area', title)).not.toMatch(/your area/i);
    expect(sayNews('zh', 'here', title)).toBe(`附近有条轻松本地新闻：${title}。`);
    expect(sayNews('yue', '九龍', title)).toContain('九龍附近有條輕鬆本地新聞');
    expect(newsLocalPlaceLabel('yue', '附近')).toBeNull();
    expect(newsLocalPlaceLabel('en', 'here')).toBeNull();
    expect(newsLocalPlaceLabel('en', 'Hong Kong')).toBe('Hong Kong');
  });

  it('sayRecent uses 今日 when the story published today (HK calendar)', () => {
    const now = Date.parse('2026-11-17T14:00:00+08:00');
    const todayLead = { title: '輕鬆社區活動', source: 'HK01', publishedAt: now };
    expect(sayRecent('yue', todayLead)).toMatch(/^今日有條新聞：/);
    expect(sayRecent('yue', todayLead)).toContain('輕鬆社區活動');
    const oldLead = {
      title: '舊聞',
      source: 'HK01',
      publishedAt: now - 86_400_000 * 2,
    };
    expect(sayRecent('yue', oldLead)).toMatch(/^最近有條新聞：/);
    expect(sayRecent('yue', { title: '無日期', source: '' })).toMatch(/^最近有條新聞：/);
  });

  it('frames topical AI news without 附近有條輕鬆本地新聞', () => {
    const title = 'OpenAI ships a smaller reasoning model';
    const line = sayTopicalNews('yue', 'artificial intelligence', title);
    expect(line).toContain('AI');
    expect(line).toContain(title);
    expect(line).not.toContain('附近有條輕鬆本地新聞');
    expect(line).not.toMatch(/^調查/u);
  });

  it('isJunkNewsHeadline drops fund ISINs and 股價 chrome from AI search noise', () => {
    const fund = 'Echiquier Artificial Intelligence B EUR 0P0001DYQM';
    const tick = 'F 股價';
    expect(isJunkNewsHeadline(fund)).toBe(true);
    expect(isJunkNewsHeadline(tick)).toBe(true);
    expect(isHeavyHeadline(fund)).toBe(true);
    expect(isJunkNewsHeadline('OpenAI ships a smaller reasoning model')).toBe(false);
    expect(
      pickDefaultHeadlines(
        [
          { title: fund, source: 'Funds' },
          { title: tick, source: '' },
          { title: 'Researchers demo a safer classroom AI assistant', source: 'Sci' },
        ],
        { preferLight: true },
      ).map((h) => h.title),
    ).toEqual(['Researchers demo a safer classroom AI assistant']);
  });

  it('topicalHeadlineMatches accepts AI synonyms in headlines', () => {
    expect(topicalHeadlineMatches('artificial intelligence', 'OpenAI ships a smaller model')).toBe(true);
    expect(topicalHeadlineMatches('artificial intelligence', '人工智能模型幫醫生更快整理病歷')).toBe(true);
    expect(topicalHeadlineMatches('artificial intelligence', 'A puppy parade fills the park')).toBe(false);
    expect(topicalHeadlineMatches('mars', 'NASA rover finds ice on Mars')).toBe(true);
  });

  it('topical AI news with junk-only feeds says miss instead of unrelated recent', async () => {
    const junkRss = `<rss><channel>
      <item><title>Echiquier Artificial Intelligence B EUR 0P0001DYQM</title></item>
      <item><title>F 股價</title></item>
    </channel></rss>`;
    const lightRss = `<rss><channel>
      <item><title>A puppy parade fills the park with smiles</title></item>
    </channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(junkRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      if (url.includes('feeds.') || url.includes('rss')) {
        return new Response(lightRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext("what's the latest AI news?", {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
    });
    expect(live.spoken).toMatch(/couldn't find|find a headline/i);
    expect(live.spoken).not.toMatch(/puppy parade/i);
    expect(live.prompt).toMatch(/no fresh headline for topic/i);
    expect(live.prompt).toMatch(/Do not invent or read Wikipedia instead/i);
  });

  it('yue topical AI news skips fund lines and keeps 關於AI framing', async () => {
    const yahooRss = `<rss><channel>
      <item><title>Echiquier Artificial Intelligence B EUR 0P0001DYQM - Funds</title></item>
      <item><title>F 股價</title></item>
      <item><title>人工智能模型幫醫生更快整理病歷 - 科技</title></item>
    </channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(yahooRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('最新有咩 AI 新聞？', {
      lang: 'yue',
      fetch: fetchImpl,
      cache: new Map(),
    });
    expect(planTools('最新有咩 AI 新聞？').newsQuery).toMatch(/artificial intelligence/i);
    expect(live.spoken).toMatch(/關於AI/);
    expect(live.spoken).toContain('人工智能模型幫醫生更快整理病歷');
    expect(live.spoken).not.toContain('0P0001DYQM');
    expect(live.spoken).not.toContain('Echiquier');
    expect(live.spoken).not.toMatch(/股價/);
    expect(live.spoken).not.toContain('附近有條輕鬆本地新聞');
  });

  it('speaks yue local RSS without an English here prefix when place label is coarse', async () => {
    const rss = '<rss><channel><item><title>Weird lights over Hong Kong harbour - Daily</title></item></channel></rss>';
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) return new Response(rss, { status: 200 });
      return jsonRes({}, 404);
    };
    const coarsePlace: Place = { ...HK, source: 'ip' };
    const live = await gatherLiveContext('news near me', {
      lang: 'yue',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => coarsePlace,
    });
    expect(live.spoken).toMatch(/附近有條輕鬆本地新聞/);
    expect(live.spoken).not.toMatch(/\bhere\b/i);
    expect(live.spoken).toContain('Weird lights');
  });

  it('prefers CJK headlines over English wires when the UI language is zh', () => {
    const items = [
      { title: 'Scientists discover quirky deep-sea fish', source: 'Wire' },
      { title: '科学家发现深海奇特鱼类', source: 'Sci' },
    ];
    expect(preferHeadlinesForLang('zh', items).map((h) => h.title)).toEqual(['科学家发现深海奇特鱼类']);
    expect(pickDefaultHeadlines(items, { lang: 'zh' }).map((h) => h.title)).toEqual(['科学家发现深海奇特鱼类']);
  });

  it('requests Google News in zh when the user asks in Mandarin', async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('news.google.com')) {
        return new Response(
          '<rss><channel><item><title>社区花市周末开张 - Local</title></item></channel></rss>',
          { status: 200 },
        );
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('今天有什么新闻？', {
      lang: 'zh',
      fetch: fetchImpl,
      cache: new Map(),
      locate: async () => HK,
    });
    const google = urls.find((u) => u.includes('news.google.com'));
    expect(google).toBeDefined();
    expect(google!).toMatch(/hl=zh-CN/);
    expect(google!).toMatch(/gl=HK/);
    expect(live.spoken).toMatch(/最近有条新闻/);
    expect(live.spoken).toContain('社区花市');
    expect(live.spoken).not.toMatch(/From the news|Around here|\bhere\b/i);
  });

  it('builds Mandarin/Cantonese Google packs for Chinese editions', () => {
    expect(newsPackForRegion('HK', 'yue')).toEqual({ hl: 'zh-HK', gl: 'HK', ceid: 'HK:zh-Hant' });
    expect(newsPackForRegion('HK', 'zh')).toEqual({ hl: 'zh-CN', gl: 'HK', ceid: 'HK:zh-Hans' });
  });

  it('drops grim headlines and stories from somewhere else', () => {
    const picked = pickLightHeadlines([
      { title: 'Accused robber hits the bank', source: 'Wire' },
      { title: 'Train crash kills dozens in Hong Kong', source: 'Wire' },
      { title: 'Weird museum cat in Hong Kong draws a crowd', source: 'Daily' },
      { title: 'Funny parade in Osaka', source: 'Away' },
    ], { city: 'Hong Kong', region: '' });
    expect(picked.map((h) => h.title)).toEqual(['Weird museum cat in Hong Kong draws a crowd']);
  });

  it('prefers a warm local story over a closure', () => {
    const picked = pickLightHeadlines([
      { title: 'Two Ashburn restaurants temporarily close', source: 'A' },
      { title: 'Friends leave a huge tip at an Ashburn diner', source: 'B' },
    ], { city: 'Ashburn', region: 'Virginia' });
    expect(picked[0]?.title).toContain('tip');
  });

  it('replaces a shrug or GPS-accuracy leak with the weather we already fetched', () => {
    const world = 'Place: Hong Kong.\nWeather: 29°C, feels 32°C, drizzling.';
    const spoken = '香港而家大約29度，落毛毛雨。';
    const shrug = preferLiveReply("Sorry, I don't have real-time weather. Which city are you in?", world, spoken, 'yue');
    expect(shrug).toBe(spoken);
    const used = preferLiveReply('It is 29° and drizzly. Grab a jacket — take care!', world, spoken, 'en');
    expect(used).toContain('29');
    expect(weatherAccuracyLeak('It is 29° but the location may be wrong.')).toBe(true);
    const leaked = preferLiveReply(
      "It's about 29° and raining, but this location may be wrong — network estimate.",
      world,
      spoken,
      'en',
    );
    expect(leaked).toBe(spoken);
  });

  it('falls back when a forwarded IP has no coordinates', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('1.1.1.1')) return jsonRes({ latitude: 'nil', longitude: 'nil' });
      if (url.includes('geojs.io')) return jsonRes({ city: 'Ashburn', region: 'Virginia', country: 'United States', latitude: '39.04', longitude: '-77.49' });
      return jsonRes({}, 404);
    };
    const place = await resolveDevicePlace({
      fetch: fetchImpl,
      geolocation: null,
      ip: '1.1.1.1',
      cache: new Map(),
      storage: kv(),
      session: kv(),
    });
    expect(place?.city).toBe('Ashburn');
    expect(place?.source).toBe('ip');
  });
});

describe('parseRssItems', () => {
  it('skips the channel title and splits the publisher', () => {
    const xml = '<rss><channel><title>Google News</title><item><title>Harbour lights &amp; rain - Daily</title></item></channel></rss>';
    expect(parseRssItems(xml)).toEqual([{ title: 'Harbour lights & rain', source: 'Daily' }]);
  });

  it('parses pubDate into publishedAt', () => {
    const xml = `<rss><channel><item>
      <title>Harbour lights - Daily</title>
      <pubDate>Tue, 17 Nov 2026 08:00:00 GMT</pubDate>
    </item></channel></rss>`;
    const [row] = parseRssItems(xml);
    expect(row?.publishedAt).toBe(parseNewsPublishedAt('Tue, 17 Nov 2026 08:00:00 GMT'));
    expect(isNewsPublishedToday(row?.publishedAt, Date.parse('Tue, 17 Nov 2026 12:00:00 GMT'))).toBe(true);
  });

  it('keeps description as summary and detail beats', () => {
    const xml = `<rss><channel><item>
      <title>Harbour lights &amp; rain - Daily</title>
      <description>Ferries paused for an hour after spray soaked the pier. Crews cleared drains before evening rush.</description>
    </item></channel></rss>`;
    const [row] = parseRssItems(xml);
    expect(row?.title).toBe('Harbour lights & rain');
    expect(row?.source).toBe('Daily');
    expect(row?.summary).toMatch(/Ferries paused|spray soaked/i);
    expect((row?.details?.length ?? 0) + (row?.summary ? 1 : 0)).toBeGreaterThan(0);
  });
});

describe('HK RSS speech chrome', () => {
  const title = '許志安翻唱 愛是懷疑 陳奕迅驚喜捧場';
  const body = `${title}\n20261116\n娛樂\n明報新聞網`;

  it('scrubNewsTitleForSpeech drops 有片丨 prefix and trailing 橙新聞', () => {
    const raw = '有片丨SpaceX成功 筷子 回收太空船創歷史 橙新聞';
    expect(scrubNewsTitleForSpeech(raw)).toBe('SpaceX成功 筷子 回收太空船創歷史');
    expect(scrubNewsTitleForSpeech('有片丨頭條標題', '橙新聞')).toBe('頭條標題');
    expect(scrubNewsTitleForSpeech('2002: 中国广东省诊断出首起严重急性呼吸道症候群病例')).toBe(
      '中国广东省诊断出首起严重急性呼吸道症候群病例',
    );
  });

  it('portalNewsFeedUrls prioritizes HK01 + Yahoo/MSN for Hong Kong', () => {
    const hk = portalNewsFeedUrls('HK', 'yue');
    expect(hk[0]).toContain('hk01.com');
    expect(hk.some((u) => u.includes('news.yahoo.com'))).toBe(true);
    expect(hk.some((u) => u.includes('rss.msn.com'))).toBe(true);
  });

  it('scrubNewsFeedBody drops dates, sections, and title repeat', () => {
    expect(scrubNewsFeedBody(body, title)).toBe('');
    expect(scrubNewsFeedBody('Judges praised the show.\n20261116\n娛樂', title)).toMatch(/Judges praised/);
    expect(scrubNewsFeedBody('Judges praised the show.\n20261116\n娛樂', title)).not.toMatch(/20261116|娛樂/);
    expect(scrubNewsFeedBody('⚑ 舉報\n橙新聞', title)).toBe('');
  });

  it('parseRssItems keeps headline once in spoken pack', () => {
    const xml = `<rss><channel><item>
      <title>${title} - 明報</title>
      <description>${body}</description>
    </item></channel></rss>`;
    const [row] = parseRssItems(xml);
    expect(row?.title).toBe(title);
    expect(row?.summary ?? '').not.toMatch(/20261116/);
    const spoken = sayNews('yue', 'Central', row!);
    expect(spoken).toMatch(/新聞/);
    expect(spoken).toContain(title.slice(0, 8));
    const hits = (spoken.match(new RegExp(title.slice(0, 8), 'g')) ?? []).length;
    expect(hits).toBeLessThanOrEqual(1);
    expect(spoken).not.toMatch(/20261116/);
    expect(spoken).not.toMatch(/^娛樂|娛樂$/);
  });
});

describe('t775 regional news feeds', () => {
  it('maps GPS countries to news regions', () => {
    expect(newsRegionFromPlace({ country: 'Hong Kong', region: '', city: 'Central' })).toBe('HK');
    expect(newsRegionFromPlace({ country: 'Japan', region: 'Tokyo', city: 'Shibuya' })).toBe('JP');
    expect(newsRegionFromPlace({ country: 'United States', region: 'CA', city: 'SF' })).toBe('US');
    expect(newsRegionFromPlace({ country: 'United Kingdom', region: '', city: 'London' })).toBe('UK');
    expect(newsRegionFromPlace({ country: 'Taiwan', region: '', city: 'Taipei' })).toBe('TW');
    expect(newsRegionFromPlace(null, 'en')).toBe('general');
  });

  it('returns free general RSS urls per region', () => {
    expect(regionalNewsFeedUrls('UK').some((u) => u.includes('bbci.co.uk'))).toBe(true);
    expect(regionalNewsFeedUrls('US').some((u) => u.includes('npr.org'))).toBe(true);
    expect(regionalNewsFeedUrls('JP').some((u) => u.includes('nhk.or.jp'))).toBe(true);
    expect(regionalNewsFeedUrls('general').length).toBeGreaterThan(0);
  });
});

describe('t780 light default news topics', () => {
  it('marks politics/war asks as heavyNews opt-in', () => {
    expect(planTools('any news?').heavyNews).toBe(false);
    expect(planTools('what is the latest news?').heavyNews).toBe(false);
    expect(planTools('what is the latest news?').recent).toBe(true);
    expect(planTools('politics news').heavyNews).toBe(true);
    expect(planTools('news about the war').heavyNews).toBe(true);
    expect(planTools('serious news please').heavyNews).toBe(true);
  });

  it('filters war/politics/tragedy from default picks', () => {
    const items = [
      { title: 'Missile strike escalates the war', source: 'Wire' },
      { title: 'Senate election race tightens', source: 'Politico' },
      { title: 'Scientists discover quirky deep-sea fish', source: 'Sci' },
      { title: 'New AI chatbot helps with homework', source: 'Tech' },
      { title: 'Celebrity opens a heartwarming bakery', source: 'Ent' },
    ];
    const picked = pickDefaultHeadlines(items);
    expect(picked.every((h) => !isHeavyHeadline(h.title))).toBe(true);
    expect(picked.map((h) => h.title).join(' ')).toMatch(/Scientists|AI|Celebrity/);
    expect(picked.map((h) => h.title).join(' ')).not.toMatch(/Missile|election/i);
  });

  it('allows heavy headlines when opted in', () => {
    const items = [
      { title: 'Missile strike escalates the war', source: 'Wire' },
      { title: 'Scientists discover quirky deep-sea fish', source: 'Sci' },
    ];
    const heavy = pickDefaultHeadlines(items, { allowHeavy: true, preferLight: false });
    expect(heavy.some((h) => /Missile/.test(h.title))).toBe(true);
  });

  it('isHeavyHeadline filters tragedy and war keywords', () => {
    expect(isHeavyHeadline('Missile strike escalates the war')).toBe(true);
    expect(isHeavyHeadline('Local cat wins funny costume parade')).toBe(false);
    expect(isHeavyHeadline('多地发生悲剧遇难')).toBe(true);
  });

  it('drops SARS / outbreak headlines from light picks', () => {
    const items = [
      { title: '2002: 中国广东省诊断出首起严重急性呼吸道症候群病例', source: 'Wikipedia' },
      { title: 'Celebrity opens a heartwarming bakery', source: 'Ent' },
    ];
    const picked = pickDefaultHeadlines(items);
    expect(picked.map((h) => h.title).join(' ')).toMatch(/bakery/i);
    expect(picked.map((h) => h.title).join(' ')).not.toMatch(/呼吸道|SARS|2002/i);
    expect(isHeavyHeadline('随后逐渐扩散至世界各地')).toBe(true);
  });

  it('exposes light category RSS urls', () => {
    const us = regionalLightNewsFeedUrls('US');
    expect(us.some((u) => u.includes('science') || u.includes('1007'))).toBe(true);
    expect(us.some((u) => u.includes('health') || u.includes('1128') || u.includes('entertainment'))).toBe(true);
    expect(regionalLightNewsFeedUrls('UK').some((u) => u.includes('science_and_environment'))).toBe(true);
  });
});

describe('news cache bust + headline rotation', () => {
  const memKv = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v); },
      removeItem: (k: string) => { m.delete(k); },
    };
  };

  it('classifies headline feed URLs for cache invalidation', () => {
    expect(isNewsFeedCacheKey('https://news.google.com/rss?hl=en')).toBe(true);
    expect(isNewsFeedCacheKey('https://en.wikipedia.org/api/rest_v1/feed/featured/2026/11/11')).toBe(true);
    expect(isNewsFeedCacheKey('https://api.open-meteo.com/v1/forecast')).toBe(false);
    expect(isNewsFeedCacheKey('https://en.wikipedia.org/w/api.php?action=query')).toBe(false);
  });

  it('invalidateNewsFeedCache drops feeds but keeps weather entries', () => {
    const cache = new Map<string, { at: number; body: string }>();
    const now = Date.now();
    cache.set('https://news.google.com/rss', { at: now, body: '<rss/>' });
    cache.set('https://api.open-meteo.com/v1/forecast', { at: now, body: '{}' });
    invalidateNewsFeedCache(cache);
    expect(cache.has('https://news.google.com/rss')).toBe(false);
    expect(cache.has('https://api.open-meteo.com/v1/forecast')).toBe(true);
  });

  it('selectNewsLead bans recently spoken titles and does not loop', () => {
    const items = [
      { title: 'Alpha story' },
      { title: 'Beta story' },
      { title: 'Gamma story' },
    ];
    const kv = memKv();
    expect(selectNewsLead(items, kv)?.title).toBe('Alpha story');
    expect(selectNewsLead(items, kv)?.title).toBe('Beta story');
    expect(selectNewsLead(items, kv)?.title).toBe('Gamma story');
    // Pool exhausted — honest miss, never re-tell Alpha.
    expect(selectNewsLead(items, kv)).toBeUndefined();
    const told = JSON.parse(kv.getItem(NEWS_TOLD_KEY) ?? '[]') as Array<{ t: string }>;
    expect(told.map((r) => r.t)).toEqual([
      normalizeNewsTitle('Alpha story'),
      normalizeNewsTitle('Beta story'),
      normalizeNewsTitle('Gamma story'),
    ]);
    expect(kv.getItem(NEWS_LAST_KEY)).toBe(normalizeNewsTitle('Gamma story'));
  });

  it('selectNewsLead treats near-duplicate titles as already told', () => {
    const kv = memKv();
    expect(selectNewsLead([{ title: 'Cat Wins Contest!' }], kv)?.title).toBe('Cat Wins Contest!');
    expect(selectNewsLead([{ title: 'cat wins contest' }], kv)).toBeUndefined();
  });

  it('does not re-tell the same single portal headline on repeat taps', async () => {
    const kv = memKv();
    const portalRss =
      '<rss><channel><item><title>A bakery opens a cheerful night market stall</title></item></channel></rss>';
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(portalRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return jsonRes({}, 404);
    };
    const opts = {
      lang: 'en' as const,
      fetch: fetchImpl,
      cache: new Map<string, { at: number; body: string }>(),
      storage: kv,
      locate: async () => null,
    };
    const first = await gatherLiveContext('what is the latest news?', opts);
    expect(first.spoken).toContain('bakery');
    const second = await gatherLiveContext('what is the latest news?', opts);
    expect(second.spoken.toLowerCase()).toMatch(/couldn't find a headline|搵唔到新聞|找不到新闻|ニュースが見つから/);
    expect(second.spoken.toLowerCase()).not.toContain('bakery');
    expect(second.prompt).toMatch(/no fresh headline|unavailable/i);
    // LLM history re-tell must not win over the honest miss.
    expect(
      preferLiveReply('From the news: A bakery opens a cheerful night market stall.', second.prompt, second.spoken, 'en'),
    ).toBe(second.spoken);
  });

  it('rotates across distinct headlines before missing', async () => {
    const kv = memKv();
    const portalRss = `<rss><channel>
      <item><title>A bakery opens a cheerful night market stall</title></item>
      <item><title>Scientists share a quirky AI drawing tip</title></item>
      <item><title>A puppy parade fills the park with smiles</title></item>
    </channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        return new Response(portalRss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
      }
      return jsonRes({}, 404);
    };
    const opts = {
      lang: 'en' as const,
      fetch: fetchImpl,
      cache: new Map<string, { at: number; body: string }>(),
      storage: kv,
      locate: async () => null,
    };
    const heard = new Set<string>();
    for (let i = 0; i < 3; i += 1) {
      const live = await gatherLiveContext('what is the latest news?', opts);
      expect(live.spoken.toLowerCase()).not.toMatch(/couldn't find/);
      if (/bakery/i.test(live.spoken)) heard.add('bakery');
      if (/Scientists|AI drawing/i.test(live.spoken)) heard.add('ai');
      if (/puppy/i.test(live.spoken)) heard.add('puppy');
    }
    expect(heard.size).toBe(3);
    const fourth = await gatherLiveContext('what is the latest news?', opts);
    expect(fourth.spoken.toLowerCase()).toMatch(/couldn't find a headline/);
    expect(toldNewsTitles(kv)).toHaveLength(3);
  });

  it('widens and picks a fresh headline after the first pool is exhausted', async () => {
    const kv = memKv();
    let feedFetches = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com') || url.includes('feeds.bbci.co.uk')) {
        feedFetches += 1;
        if (url.includes('rss.msn.com')) {
          return new Response(
            `<rss><channel><item><title>Orbit gardeners grow glowing tomatoes on a night ship</title><description>Crews say the fruit tastes like summer and lights the galley.</description></item></channel></rss>`,
            { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
          );
        }
        return new Response(
          `<rss><channel><item><title>A bakery opens a cheerful night market stall</title><description>Locals line up for warm cinnamon buns and soft jazz.</description></item></channel></rss>`,
          { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
        );
      }
      return jsonRes({}, 404);
    };
    const opts = {
      lang: 'en' as const,
      fetch: fetchImpl,
      cache: new Map<string, { at: number; body: string }>(),
      storage: kv,
      locate: async () => null,
      now: Date.UTC(2026, 10, 15, 12, 0, 0),
    };
    const first = await gatherLiveContext('what is the latest news?', opts);
    expect(first.spoken.toLowerCase()).toMatch(/bakery|cinnamon/);
    expect(first.spoken.toLowerCase()).not.toMatch(/couldn't find/);
    const second = await gatherLiveContext('what is the latest news?', opts);
    expect(second.spoken.toLowerCase()).toMatch(/orbit|tomato|galley|glowing/);
    expect(second.spoken.toLowerCase()).not.toContain('bakery');
    expect(second.spoken.toLowerCase()).not.toMatch(/couldn't find/);
    expect(feedFetches).toBeGreaterThan(3);
  });

  it('packs summary and key details so news tells are longer than a title', async () => {
    const rss = `<rss><channel>
      <item>
        <title>Orbit gnome wins science fair - SciDaily</title>
        <description>Judges praised a tiny greenhouse that grows salad greens in zero-g. The team will share open plans next month. Schools can build a classroom kit with recycled parts.</description>
      </item>
    </channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) return new Response(rss, { status: 200 });
      if (url.includes('wikipedia.org') && url.includes('/feed/featured/')) return jsonRes({ news: [] });
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('what is the latest news?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      storage: memKv(),
      locate: async () => null,
    });
    expect(live.spoken.toLowerCase()).toMatch(/orbit gnome|science fair/);
    expect(live.spoken.toLowerCase()).toMatch(/greenhouse|salad|zero-g|open plans|classroom/);
    expect(live.spoken.length).toBeGreaterThan(120);
    expect(live.prompt).toMatch(/Summary:|Key details:/i);
    expect(newsDetailsFromText(
      'Judges praised a tiny greenhouse that grows salad greens in zero-g. The team will share open plans next month.',
      'Orbit gnome wins science fair',
    ).length).toBeGreaterThanOrEqual(1);
  });

  it('wiki-enriches title-only light news so plain any-news asks stay long', async () => {
    const rss = `<rss><channel>
      <item><title>Orbit gnome wins science fair - SciDaily</title></item>
    </channel></rss>`;
    let wikiApiHits = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) return new Response(rss, { status: 200 });
      if (url.includes('wikipedia.org') && url.includes('/feed/featured/')) return jsonRes({ news: [] });
      if (url.includes('wikipedia.org') && url.includes('api.php')) {
        wikiApiHits += 1;
        return jsonRes({
          query: {
            pages: {
              '1': {
                index: 1,
                title: 'Orbit gnome',
                extract: 'Judges praised a tiny greenhouse that grows salad greens in zero-g. The team will share open plans next month.',
              },
            },
          },
        });
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('any news?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      storage: memKv(),
      locate: async () => null,
    });
    expect(wikiApiHits).toBeGreaterThan(0);
    expect(live.spoken.toLowerCase()).toMatch(/orbit gnome|science fair/);
    expect(live.spoken.toLowerCase()).toMatch(/greenhouse|salad|zero-g|open plans/);
    expect(live.spoken.length).toBeGreaterThan(100);
    expect(live.prompt).toMatch(/Summary:|Key details:/i);
  });

  it('clientLiveContext persists told titles in localStorage across gather calls', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../lib/live-tools.ts', import.meta.url), 'utf8'),
    );
    expect(src).toMatch(/storage:\s*safeStorage\('local'\)/);
    expect(src).toMatch(/safeStorage\('local'\)/);
    expect(src).toContain('NEWS_TOLD_SESSION_KEY');
    // Default gather path must not prefer session-only bans (tab close = same-old).
    expect(src).toMatch(
      /newsStorage = opts\.storage === undefined \? safeStorage\('local'\) : opts\.storage/,
    );
  });

  it('preferLiveReply always speaks the live news line, never a history re-tell', () => {
    const world = 'Light news (US): “Puppy parade fills the park” (Wire). Summary: Crowds cheered as rescue dogs strutted in hats.';
    const spoken = 'From the news: Puppy parade fills the park. Crowds cheered as rescue dogs strutted in hats.';
    const historyRetell = 'From the news: A bakery opens a cheerful night market stall.';
    expect(preferLiveReply(historyRetell, world, spoken, 'en')).toBe(spoken);
    expect(worldBlock(world)).toMatch(/READ that ONE story fully|Key details|Summary/i);
  });

  it('refetches Google News on each user news tap instead of reusing cache', async () => {
    let rssHits = 0;
    const rss = '<rss><channel><item><title>Orbit gnome wins science fair - Sci</title></item><item><title>Moon bakery opens at night - Local</title></item></channel></rss>';
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) {
        rssHits += 1;
        return new Response(rss, { status: 200 });
      }
      if (url.includes('wikipedia.org') && url.includes('/feed/featured/')) {
        return jsonRes({ news: [] });
      }
      return jsonRes({}, 404);
    };
    const cache = new Map<string, { at: number; body: string }>();
    const opts = { lang: 'en' as const, fetch: fetchImpl, cache, locate: async () => null, storage: memKv() };
    await gatherLiveContext('what is the latest news?', opts);
    await gatherLiveContext('what is the latest news?', opts);
    expect(rssHits).toBeGreaterThanOrEqual(2);
  });

  it('rotates Yahoo/MSN portal feeds when Google is blocked', async () => {
    const portalHits: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('news.google.com')) throw new Error('cors');
      if (url.includes('rss2json.com')) return new Response('nope', { status: 403 });
      if (url.includes('news.yahoo.com') || url.includes('rss.msn.com')) {
        portalHits.push(url);
        const title = url.includes('msn')
          ? 'Museum cat parade draws smiles'
          : 'Quirky robot wins a science fair';
        return new Response(
          `<rss><channel><item><title>${title}</title></item></channel></rss>`,
          { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
        );
      }
      return jsonRes({}, 404);
    };
    const live = await gatherLiveContext('what is the latest news?', {
      lang: 'en',
      fetch: fetchImpl,
      cache: new Map(),
      storage: memKv(),
      locate: async () => null,
      // Fixed clock so utcStamp offsets are deterministic relative to "now".
      now: Date.UTC(2026, 10, 15, 12, 0, 0),
    });
    expect(portalHits.some((u) => u.includes('yahoo'))).toBe(true);
    expect(live.spoken).toMatch(/robot|museum|cat|parade|science/i);
  });
});
