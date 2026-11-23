import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TIMEOUT_MS,
  createMusicStream,
  musicAttributionLine,
  musicPlaybackPlan,
  type FetchLike,
  type MusicTrack,
} from '../lib/music-stream';
import {
  PROVIDER_MAX_LIMIT,
  PROVIDER_SPECS,
  ccLabelFromUrl,
  clampLimit,
  incompetechSearch,
  incompetechStreamUrl,
  jamendoSearchUrl,
  parseJamendoResponse,
  parsePixabayResponse,
  pixabaySearchUrl,
} from '../lib/music-stream-providers';

/** Realistic Jamendo `/v3.0/tracks/` envelope, trimmed to the fields we read. */
const JAMENDO_PAYLOAD = {
  headers: {
    status: 'success',
    code: 0,
    error_message: '',
    warnings: '',
    results_count: 2,
  },
  results: [
    {
      id: '1214931',
      name: 'Aurora Drift',
      duration: 214,
      artist_id: '355520',
      artist_name: 'Nova Ensemble',
      album_name: 'Long Nights',
      album_id: '99551',
      license_ccurl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
      position: 1,
      releasedate: '2021-03-05',
      album_image: 'https://usercontent.jamendo.com/?trackid=1214931&format=300',
      audio: 'https://prod-1.storage.jamendo.com/?trackid=1214931&format=mp32&from=app-devsite',
      audiodownload: '',
      prourl: '',
      shorturl: 'https://share.jamendo.com/x/z3H',
      shareurl: 'https://www.jamendo.com/track/1214931',
      waveform: 'https://prod-1.storage.jamendo.com/?trackid=1214931&format=waveform',
      image: 'https://usercontent.jamendo.com/?trackid=1214931&format=300',
      audiodownload_allowed: false,
    },
    {
      id: '1170796',
      name: '雨夜',
      duration: 187,
      artist_name: 'Canto Kid',
      license_ccurl: 'http://creativecommons.org/licenses/by/4.0/',
      audio: 'https://prod-1.storage.jamendo.com/?trackid=1170796&format=mp32&from=app-devsite',
      shareurl: 'https://www.jamendo.com/track/1170796',
      audiodownload_allowed: true,
    },
    // Malformed row: no audio URL must be dropped, never fabricated.
    { id: '999', name: 'Broken Row', artist_name: 'Nobody', duration: 100 },
  ],
};

function jsonResponse(body: unknown, status = 200): Awaited<ReturnType<FetchLike>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function fetchReturning(body: unknown, status = 200) {
  return vi.fn<FetchLike>(async () => jsonResponse(body, status));
}

const JAMENDO_ENV = { NEXT_PUBLIC_JAMENDO_CLIENT_ID: 'test-client-id' };

describe('music stream — availability is truthful', () => {
  it('reports a provider with no key as unavailable and searches to nothing', async () => {
    const stream = createMusicStream({ env: {}, fetch: fetchReturning(JAMENDO_PAYLOAD) });
    const jam = stream.providers().find((p) => p.id === 'jamendo');
    expect(jam).toBeDefined();
    expect(jam!.available()).toBe(false);
    expect(jam!.audioAnalysable).toBe(true);

    const caps = stream.capabilities().find((c) => c.id === 'jamendo')!;
    expect(caps.keyEnv).toBe('NEXT_PUBLIC_JAMENDO_CLIENT_ID');
    expect(caps.keyPresent).toBe(false);
    expect(caps.available).toBe(false);

    const res = await stream.search('lofi', { providers: ['jamendo'] });
    expect(res.tracks).toEqual([]);
    expect(res.failures.map((f) => `${f.provider}:${f.reason}`)).toContain('jamendo:no-key');
  });

  it('a direct provider.search rejects instead of inventing rows', async () => {
    const stream = createMusicStream({ env: {}, fetch: fetchReturning(JAMENDO_PAYLOAD) });
    const jam = stream.providers().find((p) => p.id === 'jamendo')!;
    await expect(jam.search('lofi')).rejects.toMatchObject({ reason: 'no-key' });
  });

  it('exposes only key-present providers as available', () => {
    const stream = createMusicStream({ env: JAMENDO_ENV });
    expect(stream.availableProviders()).toEqual(['jamendo', 'incompetech']);
  });

  it('keeps Free Music Archive retired — never searched, always explained', async () => {
    const stream = createMusicStream({ env: JAMENDO_ENV, fetch: fetchReturning(JAMENDO_PAYLOAD) });
    const fma = PROVIDER_SPECS.fma;
    expect(fma.retired).toBe(true);
    expect(stream.availableProviders()).not.toContain('fma');
    // Not even present as a searchable provider row — docs explain the dead API.
    expect(stream.providers().some((p) => p.id === 'fma')).toBe(false);
  });
});

describe('music stream — Jamendo parsing', () => {
  it('parses a realistic envelope into MusicTrack rows', () => {
    const out = parseJamendoResponse(JAMENDO_PAYLOAD);
    expect(out.error).toBeUndefined();
    expect(out.tracks).toHaveLength(2);

    const first = out.tracks[0]!;
    expect(first).toMatchObject({
      id: 'jamendo:1214931',
      provider: 'jamendo',
      title: 'Aurora Drift',
      artist: 'Nova Ensemble',
      durationSec: 214,
      licence: 'CC BY-NC-SA 3.0',
      analysable: true,
      shareUrl: 'https://www.jamendo.com/track/1214931',
    });
    expect(first.streamUrl).toBe(
      'https://prod-1.storage.jamendo.com/?trackid=1214931&format=mp32&from=app-devsite',
    );
    // CJK titles survive untouched (4 locales must not be mangled here).
    expect(out.tracks[1]!.title).toBe('雨夜');
  });

  it('preserves licence and attribution verbatim in the track', () => {
    const [first] = parseJamendoResponse(JAMENDO_PAYLOAD).tracks;
    expect(first!.attribution).toContain('"Aurora Drift" by Nova Ensemble');
    expect(first!.attribution).toContain('Jamendo');
    expect(first!.attribution).toContain('CC BY-NC-SA 3.0');
    expect(first!.attribution).toContain('http://creativecommons.org/licenses/by-nc-sa/3.0/');
    expect(first!.attribution).toContain('https://www.jamendo.com/track/1214931');
    expect(musicAttributionLine(first!)).toBe(first!.attribution);
  });

  it('treats HTTP 200 + headers.status=failed as a provider error, not an empty result', () => {
    const out = parseJamendoResponse({
      headers: {
        status: 'failed',
        code: 5,
        error_message: 'Jamendo Api Invalid Client Id Error: Your credential is not authorized.',
        results_count: 0,
      },
      results: [],
    });
    expect(out.tracks).toEqual([]);
    expect(out.error?.reason).toBe('provider-error');
    expect(out.error?.detail).toContain('Invalid Client Id');
  });

  it('drops rows with no playable audio URL', () => {
    const out = parseJamendoResponse({
      headers: { status: 'success' },
      results: [{ id: '1', name: 'no audio' }, { id: '2', name: 'ftp', audio: 'ftp://x/y.mp3' }],
    });
    expect(out.tracks).toEqual([]);
  });

  it('labels CC deeds it recognises and falls back for unknown URLs', () => {
    expect(ccLabelFromUrl('http://creativecommons.org/licenses/by-nc-sa/3.0/')).toBe('CC BY-NC-SA 3.0');
    expect(ccLabelFromUrl('http://creativecommons.org/licenses/by/4.0/')).toBe('CC BY 4.0');
    expect(ccLabelFromUrl('https://example.com/nope')).toBeNull();
    expect(ccLabelFromUrl(undefined)).toBeNull();
  });

  it('builds a search URL with the key, JSON format, limit and query', () => {
    const url = new URL(
      jamendoSearchUrl({ clientId: 'cid', query: 'lofi 雨夜', limit: 7 }),
    );
    expect(url.origin + url.pathname).toBe('https://api.jamendo.com/v3.0/tracks/');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('limit')).toBe('7');
    expect(url.searchParams.get('search')).toBe('lofi 雨夜');
    expect(url.searchParams.get('audioformat')).toBe('mp32');
  });
});

describe('music stream — client behaviour', () => {
  it('merges provider results, de-duplicates, and keeps attribution', async () => {
    const stream = createMusicStream({
      env: { ...JAMENDO_ENV, NEXT_PUBLIC_PIXABAY_API_KEY: 'pix-key' },
      fetch: vi.fn<FetchLike>(async (url) =>
        url.includes('jamendo.com')
          ? jsonResponse(JAMENDO_PAYLOAD)
          : jsonResponse({
              total: 1,
              totalHits: 1,
              hits: [
                {
                  id: 4711,
                  tags: 'calm piano',
                  user: 'pixuser',
                  duration: 132,
                  audio: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
                  pageURL: 'https://pixabay.com/music/calm-piano-4711/',
                },
              ],
            }),
      ),
    });
    const res = await stream.search('calm', { providers: ['jamendo', 'pixabay'] });
    expect(res.failures).toEqual([]);
    expect(res.tracks).toHaveLength(3);
    expect(res.tracks.map((t) => t.provider)).toEqual(['jamendo', 'jamendo', 'pixabay']);
    const pix = res.tracks[2]!;
    expect(pix.licence).toBe('Pixabay Content License');
    expect(pix.attribution).toContain('pixuser');
    expect(pix.analysable).toBe(true);
    expect(pix.streamUrl).toMatch(/^https:\/\/cdn\.pixabay\.com\//);
  });

  it('surfaces a provider throw as a failure row, never as a rejection', async () => {
    const boom: FetchLike = () => {
      throw new Error('socket hang up');
    };
    const stream = createMusicStream({ env: JAMENDO_ENV, fetch: boom });
    const res = await stream.search('jazz', { providers: ['jamendo'] });
    expect(res.tracks).toEqual([]);
    expect(res.failures).toHaveLength(1);
    expect(res.failures[0]).toMatchObject({ provider: 'jamendo', reason: 'network' });
    expect(res.failures[0]!.detail).toContain('socket hang up');
  });

  it('maps a non-2xx response to an http failure without throwing', async () => {
    const stream = createMusicStream({
      env: JAMENDO_ENV,
      fetch: fetchReturning({ message: 'nope' }, 503),
    });
    const res = await stream.search('jazz', { providers: ['jamendo'] });
    expect(res.tracks).toEqual([]);
    expect(res.failures[0]).toMatchObject({ provider: 'jamendo', reason: 'http', detail: 'HTTP 503' });
  });

  it('aborts a hanging provider on timeout and reports the reason', async () => {
    const signals: AbortSignal[] = [];
    const hang: FetchLike = ((_url: string, init?: { signal?: AbortSignal }) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise(() => undefined);
    }) as FetchLike;

    const stream = createMusicStream({ env: JAMENDO_ENV, fetch: hang, timeoutMs: 25 });
    const started = Date.now();
    const res = await stream.search('ambient', { providers: ['jamendo'] });
    const elapsed = Date.now() - started;

    expect(res.tracks).toEqual([]);
    expect(res.failures[0]).toMatchObject({ provider: 'jamendo', reason: 'timeout' });
    expect(elapsed).toBeLessThan(2_000);
    expect(signals).toHaveLength(1);
    // The controller must have aborted the real request, not just rejected.
    expect(signals[0]!.aborted).toBe(true);
  });

  it('defaults to an 8 s timeout', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(8_000);
  });

  it('caches results briefly and reports fromCache', async () => {
    const fetch = fetchReturning(JAMENDO_PAYLOAD);
    const stream = createMusicStream({ env: JAMENDO_ENV, fetch, cacheTtlMs: 60_000 });
    const first = await stream.search('lofi', { providers: ['jamendo'] });
    const second = await stream.search('lofi', { providers: ['jamendo'] });
    expect(first.tracks).toHaveLength(2);
    expect(second.tracks).toHaveLength(2);
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    stream.clearCache();
    const third = await stream.search('lofi', { providers: ['jamendo'] });
    expect(third.fromCache).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('never caches failures, so a transient timeout can recover', async () => {
    let calls = 0;
    const flaky: FetchLike = async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporary');
      return jsonResponse(JAMENDO_PAYLOAD);
    };
    const stream = createMusicStream({ env: JAMENDO_ENV, fetch: flaky });
    const first = await stream.search('lofi', { providers: ['jamendo'] });
    expect(first.failures).toHaveLength(1);
    const second = await stream.search('lofi', { providers: ['jamendo'] });
    expect(second.failures).toEqual([]);
    expect(second.tracks).toHaveLength(2);
  });

  it('an empty query is a no-op: no network, no failures', async () => {
    const fetch = fetchReturning(JAMENDO_PAYLOAD);
    const stream = createMusicStream({ env: JAMENDO_ENV, fetch });
    const res = await stream.search('   ');
    expect(res).toEqual({ query: '', tracks: [], failures: [], fromCache: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('clamps absurd limits instead of forwarding them to a provider', () => {
    expect(clampLimit(undefined)).toBe(12);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
    expect(clampLimit(10_000)).toBe(PROVIDER_MAX_LIMIT);
    expect(clampLimit(3.9)).toBe(3);
    expect(clampLimit(Number.NaN)).toBe(12);
  });
});

describe('music stream — provider capability gates the analyser', () => {
  it('marks every track analysable only when the provider CDN is CORS-open', async () => {
    const stream = createMusicStream({ env: JAMENDO_ENV, fetch: fetchReturning(JAMENDO_PAYLOAD) });
    const res = await stream.search('lofi');
    for (const t of res.tracks) {
      expect(t.analysable).toBe(PROVIDER_SPECS[t.provider].audioCors);
    }
  });

  it('routes analysable tracks through the analyser and untapped ones outside it', () => {
    const analysable: MusicTrack = {
      id: 'jamendo:1',
      provider: 'jamendo',
      title: 'x',
      artist: 'y',
      durationSec: 1,
      streamUrl: 'https://prod-1.storage.jamendo.com/?trackid=1&format=mp32',
      licence: 'CC BY 4.0',
      attribution: 'x',
      analysable: true,
    };
    expect(musicPlaybackPlan(analysable)).toMatchObject({
      kind: 'analysable',
      crossOrigin: 'anonymous',
      routeThroughAnalyser: true,
    });

    const untapped: MusicTrack = {
      ...analysable,
      id: 'incompetech:Carefree',
      provider: 'incompetech',
      streamUrl: incompetechStreamUrl('Carefree'),
      analysable: false,
    };
    const plan = musicPlaybackPlan(untapped);
    expect(plan).toMatchObject({ kind: 'untapped', crossOrigin: null, routeThroughAnalyser: false });
    expect(plan.why).toContain('not CORS-readable');
  });
});

describe('music stream — Incompetech fallback', () => {
  it('is the only keyless provider and is never analysable', () => {
    expect(PROVIDER_SPECS.incompetech.keyEnv).toBeNull();
    expect(PROVIDER_SPECS.incompetech.audioCors).toBe(false);
  });

  it('matches curated tracks by keyword and keeps the CC BY attribution block', () => {
    const rows = incompetechSearch('happy');
    expect(rows.length).toBeGreaterThan(0);
    const carefree = rows.find((r) => r.title === 'Carefree')!;
    expect(carefree).toBeDefined();
    expect(carefree.analysable).toBe(false);
    expect(carefree.licence).toBe('CC BY 4.0');
    expect(carefree.artist).toBe('Kevin MacLeod');
    expect(carefree.attribution).toBe(
      '"Carefree" — Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/',
    );
    expect(carefree.durationSec).toBe(0);
    expect(carefree.streamUrl).toBe(
      'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3',
    );
  });

  it('encodes spaces in the static MP3 path and returns nothing for a miss', () => {
    expect(incompetechStreamUrl('Local Forecast - Elevator')).toBe(
      'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast%20-%20Elevator.mp3',
    );
    expect(incompetechSearch('zzzznotagennre')).toEqual([]);
    expect(incompetechSearch('')).toEqual([]);
  });

  it('respects the requested limit', () => {
    expect(incompetechSearch('chill', { limit: 1 })).toHaveLength(1);
  });
});

describe('music stream — Pixabay parser tolerance', () => {
  it('parses the hits shape we expect and drops rows without audio', () => {
    const out = parsePixabayResponse({
      total: 2,
      totalHits: 2,
      hits: [
        {
          id: 7,
          tags: 'lofi beat',
          user: 'mon',
          duration: 90,
          audio: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
          pageURL: 'https://pixabay.com/music/lofi-beat-7/',
        },
        { id: 8, tags: 'no audio', user: 'mon', duration: 12 },
      ],
    });
    expect(out.tracks).toHaveLength(1);
    expect(out.tracks[0]).toMatchObject({
      id: 'pixabay:7',
      provider: 'pixabay',
      title: 'lofi beat',
      artist: 'mon',
      durationSec: 90,
      analysable: true,
    });
  });

  it('reports a parse error when the shape is unknown instead of guessing', () => {
    const out = parsePixabayResponse({ unexpected: true });
    expect(out.tracks).toEqual([]);
    expect(out.error?.reason).toBe('parse');
  });

  it('builds a search URL with key, query and per_page', () => {
    const url = new URL(pixabaySearchUrl({ apiKey: 'k', query: 'calm', limit: 12 }));
    expect(url.origin + url.pathname).toBe('https://pixabay.com/api/audio/');
    expect(url.searchParams.get('key')).toBe('k');
    expect(url.searchParams.get('q')).toBe('calm');
    expect(url.searchParams.get('per_page')).toBe('12');
  });
});
