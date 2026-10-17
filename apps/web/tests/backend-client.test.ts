import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearProductionSession, productionApiBase, productionChat, scheduleStatePush } from '../lib/backend-client';

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage; fetch?: typeof fetch };
  const prevLs = g.localStorage;
  const prevFetch = g.fetch;
  const map = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return () => {
    g.localStorage = prevLs;
    g.fetch = prevFetch;
    delete process.env.NEXT_PUBLIC_AMOJI_API;
  };
}

describe('production backend client', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AMOJI_API;
  });

  it('does nothing when the Pages build has no API origin', async () => {
    const restore = swapLs();
    delete process.env.NEXT_PUBLIC_AMOJI_API;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    expect(productionApiBase()).toBe('');
    expect(await productionChat({ message: 'hi', history: [] })).toBeNull();
    scheduleStatePush();
    expect(fetchSpy).not.toHaveBeenCalled();
    restore();
  });

  it('opens a session and posts chat when an origin is set', async () => {
    const restore = swapLs();
    process.env.NEXT_PUBLIC_AMOJI_API = 'https://api.example.test/';
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/api/auth/session')) {
        return new Response(JSON.stringify({ token: 'a'.repeat(64) }), { status: 200 });
      }
      return new Response(JSON.stringify({ reply: 'hello?', emotionHints: { joy: 0.4 } }), { status: 200 });
    }) as typeof fetch;
    const result = await productionChat({ message: 'hi', history: [], language: 'en' });
    expect(result).toEqual({ reply: 'hello?', emotionHints: { joy: 0.4 } });
    expect(calls[0]).toContain('/api/auth/session');
    expect(calls[1]).toContain('/api/chat');
    expect(globalThis.localStorage.getItem('amoji.backend.session')).toBe('a'.repeat(64));
    clearProductionSession();
    expect(globalThis.localStorage.getItem('amoji.backend.session')).toBeNull();
    restore();
  });
});
