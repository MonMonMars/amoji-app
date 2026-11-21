// Demo-phase stargazing moment — listen-only bed-observing-star + night overlay.
// Track: owner-resources DC031 / performance-clips `bed-observing-star` (CC0).

import type { Lang } from './prefs';

export const WATCHING_STARS_DEMO_ID = 'watchingStars' as const;

/** Observing the Star — CC0 space bed from owner resources (not MV098 Night Sky Hip Hop). */
export const WATCHING_STARS_BED_CLIP_ID = 'bed-observing-star';

const WATCHING_STARS_ASK_RE =
  /睇星|看星|数星|數星|stargaz|watch(?:ing)?\s+(?:the\s+)?stars?|look\s+at\s+(?:the\s+)?stars?|星を見|一齊睇星|一齐看星/i;

export function isWatchingStarsAsk(text: string): boolean {
  return WATCHING_STARS_ASK_RE.test(text.trim());
}

/** Short companion intro — together, not a lecture. */
export function watchingStarsIntroLine(lang: Lang): string {
  const lines: Record<Lang, string> = {
    yue: '好呀，一齊抬頭睇星星。唔使講教，我陪住你就得。',
    zh: '好呀，一起抬头看星星。不用讲课，我陪着你就好。',
    en: "Okay — let's look up at the stars together. No lecture, just quiet company.",
    ja: 'うん、一緒に星を見上げよう。説教じゃなくて、そばにいるだけ。',
  };
  return lines[lang] ?? lines.yue;
}