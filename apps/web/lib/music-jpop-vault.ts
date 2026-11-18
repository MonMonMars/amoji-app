// Owner-facing music vault rows (MV###) — J-pop / city-pop / anime-style dance beds.
// Sources: Mixkit Free Stock Music License only (commercial OK, no attribution required).
// Instrumental previews via Mixkit CDN — not committed as MP3 (same as STREAM_TRACKS).

/** First MV code in this J-pop expansion pack (MV001–MV038 reserved / legacy). */
export const MV_JPOP_FIRST = 39 as const;
export const MV_JPOP_LAST = 68 as const;
export const MV_JPOP_COUNT = MV_JPOP_LAST - MV_JPOP_FIRST + 1;

type JpopSeed = {
  title: string;
  mixNum: number;
  durationMs: number;
  /** Optional Mixkit page path slug (defaults from title + mixNum). */
  mixSlug?: string;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[!?.']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mixPreview(seed: JpopSeed): string {
  const slug = seed.mixSlug ?? slugify(seed.title);
  return `https://assets.mixkit.co/music/preview/mixkit-${slug}-${seed.mixNum}.mp3`;
}

/** Curated upbeat instrumentals with J-pop / city-pop / anime-game energy (not in legacy mix-* rows). */
const JPOP_SEEDS: readonly JpopSeed[] = [
  { title: 'One More Dance', mixNum: 288, durationMs: 100_000 },
  { title: 'Rising Sun', mixNum: 523, durationMs: 92_000 },
  { title: 'Cyberpunk City', mixNum: 140, durationMs: 100_000 },
  { title: 'Pop Track 03', mixNum: 729, durationMs: 97_000 },
  { title: 'Pop Track 06', mixNum: 732, durationMs: 114_000 },
  { title: 'Dance Zero', mixNum: 740, durationMs: 93_000 },
  { title: 'Digital Clouds', mixNum: 175, durationMs: 101_000 },
  { title: 'Happy Times', mixNum: 158, durationMs: 100_000 },
  { title: 'Summer Dream', mixNum: 628, durationMs: 176_000 },
  { title: 'Fashion', mixNum: 228, durationMs: 144_000 },
  { title: 'What About Action?', mixNum: 474, durationMs: 117_000 },
  { title: 'Aerobic Fashion', mixNum: 327, durationMs: 98_000 },
  { title: 'Basketball Training', mixNum: 349, durationMs: 112_000 },
  { title: 'Swings and Slides', mixNum: 14, durationMs: 134_000 },
  { title: 'Sun in Your Eyes', mixNum: 131, durationMs: 106_000 },
  { title: 'Pop 05', mixNum: 695, durationMs: 154_000 },
  { title: 'Pop 09', mixNum: 702, durationMs: 68_000 },
  { title: 'Techno Fest Vibes', mixNum: 124, durationMs: 134_000 },
  { title: 'Raising Me Higher', mixNum: 34, durationMs: 98_000 },
  { title: 'Valley Sunset', mixNum: 127, durationMs: 134_000 },
  { title: 'Feedback Dreams', mixNum: 588, durationMs: 149_000 },
  { title: 'Karma', mixNum: 1183, durationMs: 135_000 },
  { title: 'Keeping Fit', mixNum: 82, durationMs: 99_000 },
  { title: 'Bold and Brash', mixNum: 62, durationMs: 99_000 },
  { title: 'Fight Till the End', mixNum: 81, durationMs: 106_000 },
  { title: 'Tides Turning', mixNum: 439, durationMs: 120_000 },
  { title: 'Relax Beat', mixNum: 292, durationMs: 108_000 },
  { title: 'Gimme that Groove', mixNum: 872, durationMs: 88_000, mixSlug: 'gimme-that-groove' },
  { title: 'Take this Higher', mixNum: 1012, durationMs: 99_000 },
  { title: 'Midnight Funk', mixNum: 1147, durationMs: 107_000 },
] as const;

if (JPOP_SEEDS.length !== MV_JPOP_COUNT) {
  throw new Error(`music-jpop-vault: expected ${MV_JPOP_COUNT} seeds, got ${JPOP_SEEDS.length}`);
}

function ownerCode(n: number): string {
  return `MV${String(n).padStart(3, '0')}`;
}

export interface JpopVaultRow {
  id: string;
  ownerCode: string;
  style: 'jpop';
  title: string;
  url: string;
  durationMs: number;
  license: 'Mixkit-Free';
  credit: string;
  source: string;
}

/** MV039–MV068 J-pop vault stream beds (Mixkit preview URLs). */
export const JPOP_VAULT_STREAM_TRACKS: readonly JpopVaultRow[] = JPOP_SEEDS.map((seed, i) => {
  const code = ownerCode(MV_JPOP_FIRST + i);
  return {
    id: code,
    ownerCode: code,
    style: 'jpop',
    title: seed.title,
    url: mixPreview(seed),
    durationMs: seed.durationMs,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  };
});

export function streamTrackByOwnerCode(code: string): JpopVaultRow | null {
  const norm = code.trim().toUpperCase();
  return JPOP_VAULT_STREAM_TRACKS.find((t) => t.ownerCode === norm || t.id === norm) ?? null;
}

export const HIGHEST_MV_OWNER_CODE = ownerCode(MV_JPOP_LAST);