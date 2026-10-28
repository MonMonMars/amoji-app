import { afterEach, describe, expect, it } from 'vitest';
import { gatherChatWorld } from '../src/live.js';

afterEach(() => {
  delete process.env.AMOJI_TOOLS;
});

describe('production live facts', () => {
  it('does not touch the network for small talk', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response('no', { status: 500 });
    };
    const live = await gatherChatWorld('how are you?', { fetch: fetchImpl });
    expect(live).toEqual({ prompt: '', spoken: '' });
    expect(calls).toBe(0);
  });

  it('fetches Open-Meteo weather and a headline without an API key', async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('geojs.io')) {
        return Response.json({ city: 'Hong Kong', region: '', country: 'Hong Kong', latitude: '22.3', longitude: '114.2' });
      }
      if (url.includes('api.open-meteo.com/v1/forecast')) {
        return Response.json({ current: { temperature_2m: 28.4, weather_code: 1 } });
      }
      if (url.includes('news.google.com')) {
        return new Response(
          '<rss><channel><item><title>Google News</title></item><item><title>Cat wins a funny contest - Daily</title></item></channel></rss>',
          { status: 200, headers: { 'content-type': 'application/xml' } },
        );
      }
      if (url.includes('wikipedia.org/api/rest_v1/feed/featured/')) {
        return Response.json({ news: [{ story: '<a>A parade</a> fills the harbour.' }] });
      }
      return new Response('no', { status: 404 });
    };
    const weather = await gatherChatWorld('what is the weather here?', { language: 'en', fetch: fetchImpl });
    expect(weather.prompt).toContain('28°C');
    expect(weather.prompt).toContain('Hong Kong');
    expect(weather.spoken).toContain('28°');
    expect(urls.some((u) => u.startsWith('https://api.open-meteo.com/v1/forecast'))).toBe(true);
    expect(urls.some((u) => u.includes('geojs.io'))).toBe(true);

    const news = await gatherChatWorld('what is the latest news?', { language: 'en', fetch: fetchImpl });
    expect(news.prompt).toContain('Recent news');
    expect(news.prompt).toContain('Cat wins a funny contest');
    expect(news.prompt).not.toContain('Google News:');
    expect(news.spoken).toContain('Cat wins');
    expect(urls.some((u) => u.startsWith('https://news.google.com/rss'))).toBe(true);
  });

  it('can be turned off with AMOJI_TOOLS=0', async () => {
    process.env.AMOJI_TOOLS = '0';
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response('no', { status: 500 });
    };
    const live = await gatherChatWorld('weather', { fetch: fetchImpl });
    expect(live.prompt).toBe('');
    expect(calls).toBe(0);
  });
});
