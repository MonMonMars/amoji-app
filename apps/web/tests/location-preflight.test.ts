import { afterEach, describe, expect, it, vi } from 'vitest';

describe('location preflight', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns unsupported when geolocation is missing', async () => {
    vi.stubGlobal('navigator', {});
    const { requestLocation, locationSupported } = await import('../lib/location-preflight');
    expect(locationSupported()).toBe(false);
    expect(await requestLocation()).toBe('unsupported');
  });

  it('returns granted when browser fix succeeds', async () => {
    const geo = {
      getCurrentPosition(ok: (pos: { coords: { latitude: number; longitude: number } }) => void) {
        ok({ coords: { latitude: 22.3, longitude: 114.2 } });
      },
    };
    vi.stubGlobal('navigator', { geolocation: geo });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
      },
      sessionStorage: {
        getItem: (k: string) => store.get(`s:${k}`) ?? null,
        setItem: (k: string, v: string) => { store.set(`s:${k}`, v); },
        removeItem: (k: string) => { store.delete(`s:${k}`); },
      },
    });
    const { requestLocation } = await import('../lib/location-preflight');
    expect(await requestLocation()).toBe('granted');
  });
});
