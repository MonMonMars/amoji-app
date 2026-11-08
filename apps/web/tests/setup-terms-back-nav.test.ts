import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NAV_RETURN_KEY,
  NAV_RETURN_FALLBACK,
  absorbNavReturnFromReferrer,
  navigateNavBack,
  recordNavReturn,
  resolveNavReturnPath,
} from '../lib/nav-return';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('nav return path', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const g = globalThis as { sessionStorage?: Storage; document?: Document; window?: Window };
    g.sessionStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    g.window = { location: { origin: 'https://amoji.test' }, history: { length: 1 } } as Window;
    g.document = { referrer: '' } as Document;
  });

  afterEach(() => {
    const g = globalThis as { sessionStorage?: Storage; document?: Document; window?: Window };
    delete g.sessionStorage;
    delete g.document;
    delete g.window;
  });

  it('stores safe in-app paths and rejects open redirects', () => {
    recordNavReturn('/chat');
    expect(resolveNavReturnPath()).toBe('/chat');
    recordNavReturn('//evil.test/phish');
    expect(resolveNavReturnPath()).toBe('/chat');
    recordNavReturn('/terms');
    expect(resolveNavReturnPath()).toBe('/chat');
  });

  it('absorbs same-origin referrer on entry', () => {
    const g = globalThis as { document: Document };
    g.document = { referrer: 'https://amoji.test/select' } as Document;
    absorbNavReturnFromReferrer();
    expect(store.get(NAV_RETURN_KEY)).toBe('/select');
  });

  it('navigateNavBack prefers stored path, else history, else splash', () => {
    const calls: string[] = [];
    const router = {
      push: (href: string) => calls.push(`push:${href}`),
      back: () => calls.push('back'),
    };

    navigateNavBack(router);
    expect(calls).toEqual([`push:${NAV_RETURN_FALLBACK}`]);

    calls.length = 0;
    const g = globalThis as { window: Window };
    g.window = { location: { origin: 'https://amoji.test' }, history: { length: 3 } } as Window;
    navigateNavBack(router);
    expect(calls).toEqual(['back']);

    calls.length = 0;
    recordNavReturn('/credits');
    navigateNavBack(router);
    expect(calls).toEqual(['push:/credits']);
  });
});

describe('setup / terms back — wiring', () => {
  it('QuickSetup records referrer and uses navigateNavBack', () => {
    const quick = read('components/QuickSetup.tsx');
    expect(quick).toContain('absorbNavReturnFromReferrer');
    expect(quick).toContain('navigateNavBack(router)');
    expect(quick).toContain('data-testid={backTestId}');
    expect(quick).toContain("t(lang, 'back')");
  });

  it('splash records nav return before opening /setup', () => {
    expect(read('app/page.tsx')).toContain('recordNavReturn');
    expect(read('app/page.tsx')).toContain("router.push('/setup')");
  });

  it('/terms legacy route exposes terms-back', () => {
    expect(read('app/terms/page.tsx')).toContain('backTestId="terms-back"');
  });
});
