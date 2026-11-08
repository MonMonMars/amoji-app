'use client';

/** Where the user was before /select — short token, not a raw path (open redirect safe). */
export type SelectReturnFrom = 'splash' | 'setup' | 'gate' | 'mode' | 'story' | 'chat';

export const SELECT_RETURN_KEY = 'amoji.selectReturn';

const FROM_PATH: Record<SelectReturnFrom, string> = {
  splash: '/',
  setup: '/setup',
  gate: '/gate',
  mode: '/mode',
  story: '/story',
  chat: '/chat',
};

export const SELECT_RETURN_FALLBACK = '/setup';

const FROM_SET = new Set<string>(Object.keys(FROM_PATH));

export function isSelectReturnFrom(v: string): v is SelectReturnFrom {
  return FROM_SET.has(v);
}

export function recordSelectReturn(from: SelectReturnFrom): void {
  try {
    sessionStorage.setItem(SELECT_RETURN_KEY, from);
  } catch {
    /* storage blocked */
  }
}

/** Honor optional `/select?from=setup` without requiring query on every link. */
export function absorbSelectReturnFromSearch(search: string): void {
  try {
    const q = search.startsWith('?') ? search.slice(1) : search;
    const from = new URLSearchParams(q).get('from');
    if (from && isSelectReturnFrom(from)) recordSelectReturn(from);
  } catch {
    /* ignore */
  }
}

export function resolveSelectReturnPath(): string {
  try {
    const raw = sessionStorage.getItem(SELECT_RETURN_KEY);
    if (raw && isSelectReturnFrom(raw)) return FROM_PATH[raw];
  } catch {
    /* ignore */
  }
  return SELECT_RETURN_FALLBACK;
}

type RouterLike = { push: (href: string) => void; replace?: (href: string) => void };

export function pushSelect(router: RouterLike, from: SelectReturnFrom): void {
  recordSelectReturn(from);
  router.push('/select');
}

export function replaceSelect(router: RouterLike, from: SelectReturnFrom): void {
  recordSelectReturn(from);
  (router.replace ?? router.push).call(router, '/select');
}
