// Extra free gTTS voices the user can Add from Settings / the select voice row.
//
// The shipping catalog (voice-capability.ts) lists audibly distinct Google `tl`
// speakers × female/male × deep/mid/bright pitch. Same-bucket regional codes
// (en-IE ≈ en-GB, en-NZ ≈ en-AU, …) are kept here so testers can still audition
// them without flooding the default grid with near-duplicates.
//
// Add never invents unpaid licensed voices — every candidate is a real Google
// Translate `tl` this app already knows how to request. Tapping Add expands one
// pool seed into three pitch buttons (deep / mid / bright).

import type { StrKey } from './prefs';
import type { VoiceLocale } from './voice-catalog';
import type { GttsPitchTier } from './gtts-timbre';
import type { VoiceChoice } from './voice-capability';

const KEY = 'amoji.voiceExtras.v1';

/** Same order as shipping pitch buttons — keep local to avoid import cycles. */
const EXTRA_PITCH_TIERS: readonly GttsPitchTier[] = ['deep', 'mid', 'bright'];

export interface VoiceAddCandidate {
  locale: VoiceLocale;
  tl: string;
  deliveryGender: 'female' | 'male';
  labelKey: StrKey;
  /** Why this is optional rather than a default button. */
  note: string;
}

/** Stable id for a pool entry — same shape as shipping: gtts:<tl>:<f|m>:<pitch>. */
export function extraVoiceId(
  tl: string,
  gender: 'female' | 'male',
  pitch: GttsPitchTier = 'mid',
): string {
  return `gtts:${tl}:${gender === 'male' ? 'm' : 'f'}:${pitch}`;
}

/**
 * Optional test voices. Distinct-speaker regions already ship in VOICE_CHOICES;
 * these are alternate region codes Google accepts (often same speaker bucket).
 */
export const VOICE_ADD_POOL: readonly VoiceAddCandidate[] = [
  { locale: 'en', tl: 'en-IE', deliveryGender: 'female', labelKey: 'voiceRegionIe', note: 'Irish English; same bake-off bucket as en-GB.' },
  { locale: 'en', tl: 'en-IE', deliveryGender: 'male', labelKey: 'voiceRegionIe', note: 'Irish English male delivery.' },
  { locale: 'en', tl: 'en-ZA', deliveryGender: 'female', labelKey: 'voiceRegionZa', note: 'South African English; same bake-off bucket as en-GB.' },
  { locale: 'en', tl: 'en-ZA', deliveryGender: 'male', labelKey: 'voiceRegionZa', note: 'South African English male delivery.' },
  { locale: 'en', tl: 'en-NZ', deliveryGender: 'female', labelKey: 'voiceRegionNz', note: 'New Zealand English; same bake-off bucket as en-AU.' },
  { locale: 'en', tl: 'en-NZ', deliveryGender: 'male', labelKey: 'voiceRegionNz', note: 'New Zealand English male delivery.' },
  { locale: 'en', tl: 'en-HK', deliveryGender: 'female', labelKey: 'voiceRegionHkEn', note: 'Hong Kong English; same bake-off bucket as en-GB.' },
  { locale: 'en', tl: 'en-HK', deliveryGender: 'male', labelKey: 'voiceRegionHkEn', note: 'Hong Kong English male delivery.' },
  { locale: 'en', tl: 'en-CA', deliveryGender: 'female', labelKey: 'voiceRegionCa', note: 'Canadian English; same bake-off bucket as en-US.' },
  { locale: 'en', tl: 'en-CA', deliveryGender: 'male', labelKey: 'voiceRegionCa', note: 'Canadian English male delivery.' },
  { locale: 'en', tl: 'en-SG', deliveryGender: 'female', labelKey: 'voiceRegionSg', note: 'Singapore English; same bake-off bucket as en-GB.' },
  { locale: 'en', tl: 'en-SG', deliveryGender: 'male', labelKey: 'voiceRegionSg', note: 'Singapore English male delivery.' },
  { locale: 'zh', tl: 'zh-HK', deliveryGender: 'female', labelKey: 'voiceRegionHkZh', note: 'Hong Kong Mandarin; same bake-off bucket as zh-CN. Not Cantonese.' },
  { locale: 'zh', tl: 'zh-HK', deliveryGender: 'male', labelKey: 'voiceRegionHkZh', note: 'Hong Kong Mandarin male delivery. Not Cantonese.' },
  { locale: 'ja', tl: 'ja-JP', deliveryGender: 'female', labelKey: 'voiceRegionJapanese', note: 'ja-JP tag; same speaker as ja.' },
  { locale: 'ja', tl: 'ja-JP', deliveryGender: 'male', labelKey: 'voiceRegionJapanese', note: 'ja-JP tag male delivery; same speaker as ja.' },
  { locale: 'yue', tl: 'yue-HK', deliveryGender: 'female', labelKey: 'voiceRegionCantonese', note: 'yue-HK tag for Cantonese TTS testing.' },
  { locale: 'yue', tl: 'yue-HK', deliveryGender: 'male', labelKey: 'voiceRegionCantonese', note: 'yue-HK tag male delivery.' },
];

let memory: VoiceChoice[] = [];
let loaded = false;

function candidateToChoice(
  c: VoiceAddCandidate,
  n: number,
  pitchTier: GttsPitchTier = 'mid',
): VoiceChoice {
  return {
    id: extraVoiceId(c.tl, c.deliveryGender, pitchTier),
    locale: c.locale,
    engine: 'gtts',
    tl: c.tl,
    deliveryGender: c.deliveryGender,
    pitchTier,
    labelKey: c.labelKey,
    n,
  };
}

function sanitize(raw: unknown, shippingIds: ReadonlySet<string>): VoiceChoice[] {
  if (!Array.isArray(raw)) return [];
  const out: VoiceChoice[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const locale = (row as { locale?: unknown }).locale;
    const tl = (row as { tl?: unknown }).tl;
    const deliveryGender = (row as { deliveryGender?: unknown }).deliveryGender;
    const pitchRaw = (row as { pitchTier?: unknown }).pitchTier;
    const labelKey = (row as { labelKey?: unknown }).labelKey;
    const n = (row as { n?: unknown }).n;
    if (typeof tl !== 'string') continue;
    if (locale !== 'yue' && locale !== 'zh' && locale !== 'ja' && locale !== 'en') continue;
    if (deliveryGender !== 'female' && deliveryGender !== 'male') continue;
    if (typeof labelKey !== 'string' || typeof n !== 'number') continue;
    const pitchTier: GttsPitchTier =
      pitchRaw === 'bright' || pitchRaw === 'deep' || pitchRaw === 'mid'
        ? pitchRaw
        : 'mid';
    const canonical = extraVoiceId(tl, deliveryGender, pitchTier);
    if (shippingIds.has(canonical) || seen.has(canonical)) continue;
    const poolHit = VOICE_ADD_POOL.find(
      (c) => c.locale === locale && c.tl === tl && c.deliveryGender === deliveryGender,
    );
    if (!poolHit) continue;
    seen.add(canonical);
    out.push({
      id: canonical,
      locale,
      engine: 'gtts',
      tl,
      deliveryGender,
      pitchTier,
      labelKey: poolHit.labelKey,
      n,
    });
  }
  return out;
}

function persist(next: VoiceChoice[]): void {
  memory = next;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

function hydrate(shippingIds: ReadonlySet<string>): VoiceChoice[] {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(KEY);
    if (raw) memory = sanitize(JSON.parse(raw), shippingIds);
  } catch { /* ignore */ }
  return memory;
}

/** Shipping ids must be passed in so this module never imports VOICE_CHOICES. */
export function loadVoiceExtras(shippingIds: ReadonlySet<string>): readonly VoiceChoice[] {
  return hydrate(shippingIds);
}

export function extraVoiceById(
  id: string | null | undefined,
  shippingIds: ReadonlySet<string>,
): VoiceChoice | undefined {
  if (!id) return undefined;
  return hydrate(shippingIds).find((c) => c.id === id);
}

function seedKey(tl: string, gender: 'female' | 'male'): string {
  return `${tl}:${gender}`;
}

function haveSeedKeys(shippingIds: ReadonlySet<string>): Set<string> {
  const have = new Set<string>();
  for (const id of shippingIds) {
    const m = /^gtts:(.+):([fm]):(deep|mid|bright)$/.exec(id);
    if (m) have.add(seedKey(m[1]!, m[2] === 'm' ? 'male' : 'female'));
  }
  for (const c of hydrate(shippingIds)) {
    have.add(seedKey(c.tl, c.deliveryGender));
  }
  return have;
}

export function remainingVoiceAddCount(
  locale: VoiceLocale,
  shippingIds: ReadonlySet<string>,
): number {
  const have = haveSeedKeys(shippingIds);
  return VOICE_ADD_POOL.filter(
    (c) => c.locale === locale && !have.has(seedKey(c.tl, c.deliveryGender)),
  ).length;
}

/**
 * Pin the next unused pool entry for this language into the extras list as
 * deep/mid/bright pitch buttons. Returns the mid-tier choice, or null when
 * the pool is exhausted.
 */
export function addNextVoiceExtra(
  locale: VoiceLocale,
  shippingIds: ReadonlySet<string>,
  shippingCount: number,
): VoiceChoice | null {
  const current = [...hydrate(shippingIds)];
  const have = haveSeedKeys(shippingIds);
  const next = VOICE_ADD_POOL.find(
    (c) => c.locale === locale && !have.has(seedKey(c.tl, c.deliveryGender)),
  );
  if (!next) return null;
  let n = shippingCount + current.filter((c) => c.locale === locale).length;
  let mid: VoiceChoice | null = null;
  for (const pitch of EXTRA_PITCH_TIERS) {
    n += 1;
    const choice = candidateToChoice(next, n, pitch);
    current.push(choice);
    if (pitch === 'mid') mid = choice;
  }
  persist(current);
  return mid;
}

/** Test isolation. */
export function resetVoiceExtras(): void {
  memory = [];
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
