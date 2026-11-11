/**
 * Public GitHub Pages origin for SEO absolute URLs.
 * Project Pages live under /amoji-app — keep metadataBase + sitemap in sync.
 */
export const SITE_ORIGIN = 'https://monmonmars.github.io';
export const SITE_BASE_PATH = '/amoji-app';
export const SITE_URL = `${SITE_ORIGIN}${SITE_BASE_PATH}`;

/** Companion share card (same asset as apple-touch-icon). */
export const SITE_OG_IMAGE =
  'https://github.com/MonMonMars/amoji-app/releases/download/free-library-want-2026-10-12/a01-shino.png';

export const SITE_TITLE = 'Amoji — Emotional AI Companion';
export const SITE_DESCRIPTION =
  'An emotional AI companion who laughs, sulks, and stays with you. Voice chat, VRM expression, memory, and Cantonese / 中文 / 日本語 / English. Free in the browser.';

export const SITE_KEYWORDS = [
  'AI companion',
  'emotional AI',
  'VRM avatar',
  'voice chat',
  'Cantonese AI',
  'robot face SDK',
  'Amoji',
  'PWA',
] as const;
