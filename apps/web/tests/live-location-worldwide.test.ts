import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLiveCache,
  clientLiveContext,
  gatherLiveContext,
  manualPlace,
  newsPackForRegion,
  newsRegionFromPlace,
  placeLabel,
  regionalLightNewsFeedUrls,
  regionalNewsFeedUrls,
  resolveDevicePlace,
  setManualPlace,
  type GeoLike,
  type Place,
} from '../lib/live-tools';

const SRC = readFileSync(join(__dirname, '..', 'lib', 'live-tools.ts'), 'utf8');

const BERLIN: Place = {
  latitude: 52.52, longitude: 13.405, city: 'Berlin', region: 'Berlin',
  country: 'Germany', countryCode: 'DE', source: 'browser',
};
const OSAKA: Place = {
  latitude: 34.69, longitude: 135.5, city: 'Osaka', region: 'Osaka',
  country: 'Japan', countryCode: 'JP', source: 'browser',
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function kv(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}

/** Records every URL the live layer asks for, so a test can prove which
 *  location actually reached the weather and news endpoints. */
function recorder(handlers: Array<{ match: string; body: unknown }>) {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    const hit = handlers.find((h) => url.includes(h.match));
    return hit ? jsonRes(hit.body) : jsonRes({}, 404);
  };
  return { urls, fetchImpl };
}

const weatherBody = {
  current: { temperature_2m: 12.4, apparent_temperature: 11, weather_code: 3, wind_speed_10m: 9, relative_humidity_2m: 70 },
  daily: { temperature_2m_max: [14], temperature_2m_min: [7], precipitation_probability_max: [20] },
};

afterEach(() => {
  clearLiveCache();
  delete process.env.NEXT_PUBLIC_AMOJI_TOOLS;
  delete process.env.AMOJI_TOOLS;
});

describe('no built-in home city in the weather/news path', () => {
  it('carries no Hong Kong coordinates or city literal', () => {
    // A default city baked into the module is exactly the bug being fixed:
    // the companion talked about Hong Kong to users anywhere on earth.
    expect(SRC).not.toMatch(/22\.3\d*\s*,?\s*longitude/);
    expect(SRC).not.toContain("city: 'Hong Kong'");
    expect(SRC).not.toContain('latitude: 22.3');
  });

  it('scopes the news edition to the resolved country, not a fixed region', () => {
    expect(newsRegionFromPlace(BERLIN)).toBe('DE');
    expect(newsRegionFromPlace(OSAKA)).toBe('JP');
    expect(newsRegionFromPlace({ city: 'Lisbon', region: 'Lisbon', country: 'Portugal', countryCode: 'PT' })).toBe('PT');
    expect(newsRegionFromPlace({ city: 'Nairobi', region: 'Nairobi', country: 'Kenya', countryCode: 'KE' })).toBe('KE');
  });

  it('keeps a Cantonese edition for a Cantonese user with no location at all', () => {
    // Language is the only remaining Hong Kong signal, and it is a fallback:
    // a known place always wins above.
    expect(newsRegionFromPlace(null, 'yue')).toBe('HK');
    expect(newsRegionFromPlace({ city: 'Berlin', region: '', country: 'Germany' }, 'yue')).toBe('DE');
  });

  it('builds a Google News pack from the country code and the UI language', () => {
    expect(newsPackForRegion('DE', 'ja')).toEqual({ hl: 'ja', gl: 'DE', ceid: 'DE:ja' });
    expect(newsPackForRegion('UK', 'en').gl).toBe('GB');
    expect(newsPackForRegion('general', 'en').gl).toBe('US');
    expect(newsPackForRegion('general', 'yue').gl).toBe('HK');
  });

  it('offers regional feeds for countries beyond the original five', () => {
    expect(regionalNewsFeedUrls('DE').some((u) => u.includes('dw.com'))).toBe(true);
    expect(regionalNewsFeedUrls('CA').some((u) => u.includes('cbc.ca'))).toBe(true);
    expect(regionalNewsFeedUrls('IN').some((u) => u.includes('thehindu.com'))).toBe(true);
    expect(regionalNewsFeedUrls('KE').length).toBeGreaterThan(0);
    expect(regionalLightNewsFeedUrls('KE').length).toBeGreaterThan(0);
    expect(regionalLightNewsFeedUrls('AU').some((u) => u.includes('abc.net.au'))).toBe(true);
    expect(regionalLightNewsFeedUrls('DE').some((u) => u.includes('dw.com'))).toBe(true);
  });
});

describe('resolved location reaches both queries', () => {
  it('weathers and headlines the city the user is actually in', async () => {
    const { urls, fetchImpl } = recorder([
      { match: 'api.open-meteo.com/v1/forecast', body: weatherBody },
      {
        match: 'news.google.com/rss',
        body: '<rss><channel><item><title>Berlin museum cat wins a prize - Local</title></item></channel></rss>',
      },
    ]);
    const live = await gatherLiveContext("what's the weather here?", {
      lang: 'en', fetch: fetchImpl, cache: new Map(), locate: async () => BERLIN,
    });
    const weatherUrl = urls.find((u) => u.includes('/v1/forecast')) ?? '';
    expect(weatherUrl).toContain('latitude=52.52');
    expect(weatherUrl).toContain('longitude=13.405');
    expect(live.prompt).toContain('Berlin');
    expect(live.prompt).not.toContain('Hong Kong');
    expect(live.spoken).toContain('Berlin');

    clearLiveCache();
    const news = await gatherLiveContext('news near me', {
      lang: 'en', fetch: fetchImpl, cache: new Map(), locate: async () => BERLIN,
    });
    const newsUrl = urls.find((u) => u.includes('news.google.com')) ?? '';
    expect(newsUrl).toContain('gl=DE');
    expect(newsUrl).toContain('ceid=DE%3Aen');
    expect(news.prompt).toContain('Berlin');
  });

  it('a named city overrides the device location for both endpoints', async () => {
    const { urls, fetchImpl } = recorder([
      { match: 'geocoding-api.open-meteo.com', body: { results: [{ name: 'Osaka', latitude: 34.69, longitude: 135.5, country: 'Japan', country_code: 'JP', admin1: 'Osaka' }] } },
      { match: 'api.open-meteo.com/v1/forecast', body: weatherBody },
      { match: 'news.google.com/rss', body: '<rss><channel><item><title>Osaka bakery wins a contest - Local</title></item></channel></rss>' },
    ]);
    const live = await gatherLiveContext('weather and news in Osaka', {
      lang: 'en', fetch: fetchImpl, cache: new Map(), locate: async () => BERLIN,
    });
    expect(urls.find((u) => u.includes('/v1/forecast'))).toContain('latitude=34.69');
    expect(urls.find((u) => u.includes('news.google.com'))).toContain('gl=JP');
    expect(live.prompt).toContain('Osaka');
    expect(live.prompt).not.toContain('Berlin');
  });
});

describe('permission denied and offline', () => {
  it('falls back to the network place after the user denies geolocation', async () => {
    const geo: GeoLike = { getCurrentPosition(_ok, error) { error?.({ code: 1 }); } };
    const session = kv();
    const place = await resolveDevicePlace({
      fetch: async () => jsonRes({ city: 'Lisbon', region: 'Lisbon', country: 'Portugal', country_code: 'PT', latitude: '38.72', longitude: '-9.14' }),
      geolocation: geo,
      storage: kv(),
      session,
      cache: new Map(),
    });
    expect(place?.source).toBe('ip');
    expect(place?.city).toBe('Lisbon');
    expect(place?.countryCode).toBe('PT');
    expect(session.getItem('amoji.geo.denied')).toBe('1');
    // No built-in home city was substituted.
    expect(placeLabel(place!)).not.toContain('Hong Kong');
  });

  it('returns nothing rather than a made-up city when every source fails', async () => {
    const geo: GeoLike = { getCurrentPosition(_ok, error) { error?.({ code: 1 }); } };
    const place = await resolveDevicePlace({
      fetch: async () => { throw new Error('offline'); },
      geolocation: geo,
      storage: kv(),
      session: kv(),
      cache: new Map(),
    });
    expect(place).toBeNull();
  });

  it('stays silent for the unprompted brief instead of asking for a city', async () => {
    // clientLiveContext uses real fetch for IP geo; under CI load that can
    // hang past the default 5s. Race a short deadline so a stalled network
    // still counts as "no place" — which is exactly the silent-brief case.
    const live = await Promise.race([
      clientLiveContext("what's the weather here?", 'en', undefined, { brief: true })
        .catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    // No geolocation / localStorage in the node test env — the brief must be
    // empty, and above all it must not be a question about which city.
    expect(live?.spoken ?? '').not.toMatch(/which city/i);
    expect(live?.prompt ?? '').not.toContain('need a city');
  }, 10_000);

  it('skips the brief when no place can be resolved', async () => {
    const live = await gatherLiveContext("what's the weather here?", {
      lang: 'en',
      fetch: async () => jsonRes({}, 500),
      cache: new Map(),
      locate: async () => null,
      brief: true,
    });
    expect(live).toEqual({ prompt: '', spoken: '' });
  });

  it('still asks the user for a city when they asked the question themselves', async () => {
    const live = await gatherLiveContext("what's the weather?", {
      lang: 'en',
      fetch: async () => jsonRes({}, 500),
      cache: new Map(),
      locate: async () => null,
    });
    expect(live.spoken.toLowerCase()).toContain('which city');
  });

  it('skips the line when the weather endpoint fails instead of guessing', async () => {
    const live = await gatherLiveContext('weather', {
      lang: 'en',
      fetch: async () => jsonRes({}, 503),
      cache: new Map(),
      locate: async () => BERLIN,
    });
    expect(live.prompt).toContain('unavailable');
    expect(live.spoken).not.toMatch(/\d+°/);
  });
});

describe('manual city override', () => {
  it('geocodes, pins, and outranks the automatic location', async () => {
    const storage = kv();
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('geocoding-api.open-meteo.com')) {
        return jsonRes({ results: [{ name: 'Lisbon', latitude: 38.72, longitude: -9.14, country: 'Portugal', country_code: 'PT', admin1: 'Lisbon' }] });
      }
      return jsonRes({}, 404);
    };
    const pinned = await setManualPlace({ query: 'Lisbon', lang: 'en', fetch: fetchImpl, storage, cache: new Map() });
    expect(pinned?.source).toBe('manual');
    expect(pinned?.countryCode).toBe('PT');
    expect(manualPlace(storage)?.city).toBe('Lisbon');

    // A browser fix in Berlin must not displace the city they typed.
    const geo: GeoLike = { getCurrentPosition(ok) { ok({ coords: { latitude: 52.52, longitude: 13.405 } }); } };
    const resolved = await resolveDevicePlace({
      fetch: fetchImpl, geolocation: geo, storage, session: kv(), cache: new Map(),
    });
    expect(resolved?.city).toBe('Lisbon');
    expect(resolved?.source).toBe('manual');
  });

  it('stores nothing when the typed city cannot be found', async () => {
    const storage = kv();
    const place = await setManualPlace({
      query: 'Nowhereville Zedland',
      fetch: async () => jsonRes({ results: [] }),
      storage,
      cache: new Map(),
    });
    expect(place).toBeNull();
    expect(storage.getItem('amoji.place.manual.v1')).toBeNull();
  });
});
