'use client';

/** Where the user was before /setup or a legacy legal URL (in-app path only). */
export const NAV_RETURN_KEY = 'amoji.navReturn';

export const NAV_RETURN_FALLBACK = '/';

const ALLOWED = new Set([
  '/',
  '/setup',
  '/gate',
  '/select',
  '/change',
  '/chat',
  '/mode',
  '/story',
  '/play',
  '/login',
  '/credits',
]);

export function navReturnPathname(path: string): string {
  const bare = path.split('#')[0] ?? path;
  return (bare.split('?')[0] ?? bare) || '/';
}

export function isSafeNavReturnPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('://') || path.includes('\\')) return false;
  return ALLOWED.has(navReturnPathname(path));
}

export function recordNavReturn(path: string): void {
  if (!isSafeNavReturnPath(path)) return;
  try {
    sessionStorage.setItem(NAV_RETURN_KEY, navReturnPathname(path));
  } catch {
    /* storage blocked */
  }
}

/** Capture same-origin document.referrer when landing on setup / legal scroll. */
export function absorbNavReturnFromReferrer(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  try {
    const ref = document.referrer;
    if (!ref) return;
    const u = new URL(ref);
    if (u.origin !== window.location.origin) return;
    recordNavReturn(u.pathname);
  } catch {
    /* ignore */
  }
}

export function resolveNavReturnPath(): string | null {
  try {
    const raw = sessionStorage.getItem(NAV_RETURN_KEY);
    if (raw && isSafeNavReturnPath(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

type RouterLike = { push: (href: string) => void; back?: () => void };

/** Stored referrer first, then browser back, then splash. */
export function navigateNavBack(router: RouterLike, fallback = NAV_RETURN_FALLBACK): void {
  const stored = resolveNavReturnPath();
  if (stored) {
    router.push(stored);
    return;
  }
  if (typeof window !== 'undefined' && window.history.length > 1 && router.back) {
    router.back();
    return;
  }
  router.push(fallback);
}
