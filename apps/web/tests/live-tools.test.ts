import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLiveCache,
  clientLiveContext,
  gatherLiveContext,
  liveToolsEnabled,
  parseRssItems,
  pickLightHeadlines,
  placeLabel,
  planTools,
  preferLiveReply,
  resolveDevicePlace,
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

  it('plans weather here without treating the question words as a city', () => {
    const plan = planTools("what's the weather here?");
    expect(plan.weather).toBe(true);
    expect(plan.needsDevice).toBe(true);
    expect(plan.placeQuery).toBeUndefined();
    expect(plan.searchQuery).toBeUndefined();
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

  it('plans local news, topical news, and a web lookup separately', () => {
    const local = planTools('news near me');
    expect(local.news).toBe(true);
    expect(local.needsDevice).toBe(true);
    expect(local.newsQuery).toBeUndefined();

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
    expect(live.prompt).toContain('browser location');
    expect(live.prompt).toContain('Hong Kong');
    expect(live.spoken).toContain('29度');
    expect(live.spoken).toContain('落毛毛雨');
    expect(urls.some((u) => u.includes('geojs'))).toBe(false);
  });

  it('labels a network estimate as coarse', async () => {
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
    expect(live.prompt).toContain('coarse network estimate');
    expect(live.spoken).toContain('rough network guess');
    expect(live.spoken).toContain('29°');
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
    expect(live.spoken).toContain('Osaka');
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
    expect(live.spoken).toContain('轻松');
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
    expect(worldBlock('Recipe: soup.')).toContain('cook-along');
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
      expect(r.reply).toMatch(/[?？]/);
    } finally {
      globalThis.fetch = prev;
    }
  });
});

describe('local light news and reply guard', () => {
  it('drops grim headlines and stories from somewhere else', () => {
    const picked = pickLightHeadlines([
      { title: 'Accused robber hits the bank', source: 'Wire' },
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

  it('replaces a shrug with the weather we already fetched', () => {
    const world = 'Place: Hong Kong (browser location).\nWeather: 29°C, feels 32°C, drizzling.';
    const spoken = '香港而家大約29度，落毛毛雨。';
    const shrug = preferLiveReply("Sorry, I don't have real-time weather. Which city are you in?", world, spoken, 'yue');
    expect(shrug).toContain('29度');
    expect(shrug).toMatch(/[?？]/);
    const used = preferLiveReply('It is 29° and drizzly in Hong Kong. Want to stay in?', world, spoken, 'en');
    expect(used).toContain('Want to stay in?');
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
});
