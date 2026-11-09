import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SELECT_RETURN_KEY,
  SELECT_RETURN_FALLBACK,
  absorbSelectReturnFromSearch,
  pushSelect,
  recordSelectReturn,
  replaceSelect,
  resolveSelectReturnPath,
} from '../lib/select-return';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('select return path', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const g = globalThis as { sessionStorage?: Storage };
    g.sessionStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });

  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  });

  it('maps known sources to routes and falls back to /setup', () => {
    expect(resolveSelectReturnPath()).toBe(SELECT_RETURN_FALLBACK);
    recordSelectReturn('splash');
    expect(resolveSelectReturnPath()).toBe('/');
    recordSelectReturn('gate');
    expect(resolveSelectReturnPath()).toBe('/gate');
  });

  it('absorbs ?from= without requiring navigation helpers', () => {
    absorbSelectReturnFromSearch('?from=setup');
    expect(resolveSelectReturnPath()).toBe('/setup');
  });

  it('pushSelect and replaceSelect write the token then open /select', () => {
    const calls: string[] = [];
    const router = {
      push: (href: string) => calls.push(`push:${href}`),
      replace: (href: string) => calls.push(`replace:${href}`),
    };
    pushSelect(router, 'splash');
    expect(store.get(SELECT_RETURN_KEY)).toBe('splash');
    expect(calls).toEqual(['push:/select']);

    replaceSelect(router, 'mode');
    expect(store.get(SELECT_RETURN_KEY)).toBe('mode');
    expect(calls).toEqual(['push:/select', 'replace:/select']);
  });
});

describe('select back nav — wiring', () => {
  it('SelectionBoard exposes a localized back control', () => {
    const board = read('components/SelectionBoard.tsx');
    expect(board).toContain('data-testid="select-back"');
    expect(board).toContain("t(lang, 'back')");
    expect(board).toContain('resolveSelectReturnPath()');
    expect(board).toContain('absorbSelectReturnFromSearch');
  });

  it('entry routes record select return before opening /select', () => {
    expect(read('app/page.tsx')).toContain("pushSelect(router, 'splash')");
    // Rules START soft-gates audio first; select return is recorded later from title/splash.
    expect(read('components/QuickSetup.tsx')).toContain('/gate/audio?next=');
    expect(read('components/SoftLandSelect.tsx')).toContain('replaceSelect(router, selectReturnFrom)');
    expect(read('app/gate/page.tsx')).toContain('selectReturnFrom="gate"');
    expect(read('app/story/page.tsx')).toContain('selectReturnFrom="story"');
  });
});
