'use client';
// Royalty-free / public-domain music catalog for sing & dance beds.
 // Prefer first-party CC0 clips and procedural WebAudio; when the user asks
 // for a style we may stream a short Mixkit (free stock) or Wikimedia PD
 // preview URL via HTMLAudioElement — never scrape Spotify/YouTube/etc.

export type MusicStyleId =
  | 'pop'
  | 'cantopop'
  | 'jazz'
  | 'lofi'
  | 'hiphop'
  | 'electronic'
  | 'ballad'
  | 'rock'
  | 'dance'
  | 'chill'
  | 'cute'
  | 'default';

export interface StreamTrack {
  id: string;
  style: MusicStyleId;
  title: string;
  /** Absolute HTTPS URL playable in <audio> (preview / PD). */
  url: string;
  durationMs: number;
  license: 'Mixkit-Free' | 'CC0-1.0' | 'PD';
  credit: string;
  source: string;
}

/** Map user words → style id (first match wins). */
const STYLE_PATTERNS: { id: MusicStyleId; re: RegExp }[] = [
  { id: 'cantopop', re: /粵語歌|廣東歌|cantopop|canto\s*pop|港樂|香港歌/i },
  { id: 'jazz', re: /\bjazz\b|爵士|スウィング|swing/i },
  { id: 'lofi', re: /\blo[- ]?fi\b|低保真|ロー?ファイ|chillhop/i },
  { id: 'hiphop', re: /\bhip[- ]?hop\b|嘻哈|ラップ|\brap\b/i },
  { id: 'electronic', re: /\belectro(?:nic)?\b|edm|電子|テクノ|ハウス|\bhouse\b|synthwave|賽博/i },
  { id: 'ballad', re: /\bballad\b|抒情|慢歌|バラード|love\s*song/i },
  { id: 'rock', re: /\brock\b|搖滾|ロック|金屬|\bmetal\b/i },
  { id: 'dance', re: /\bdance\b|disco|派對|クラブ|跳舞音樂|舞曲/i },
  { id: 'chill', re: /\bchill\b|\bcalm\b|\brelax(?:ing|ed)?\b|冷靜|放鬆|放松|ambient|アンビエント|輕鬆|轻松|穏やか/i },
  { id: 'cute', re: /\bcute\b|可愛|萌|きゅん|甜蜜|甜蜜歌/i },
  { id: 'pop', re: /\bpop\b|流行|ポップ|流行曲|流行歌|K-?pop|ポップス/i },
];

export function detectMusicStyle(text: string): MusicStyleId | undefined {
  const t = text.trim();
  if (!t) return undefined;
  for (const { id, re } of STYLE_PATTERNS) {
    if (re.test(t)) return id;
  }
  return undefined;
}

/**
 * Curated short previews — Mixkit Free Stock Music License (commercial OK,
 * no attribution required) + Wikimedia public-domain / CC0. No DRM platforms.
 */
export const STREAM_TRACKS: readonly StreamTrack[] = [
  {
    id: 'mix-tech-house',
    style: 'electronic',
    title: 'Tech House Vibes',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-hip-hop',
    style: 'hiphop',
    title: 'Hip Hop 02',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-dreaming-big',
    style: 'pop',
    title: 'Dreaming Big',
    url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-cat-walk',
    style: 'pop',
    title: 'Cat Walk',
    url: 'https://assets.mixkit.co/music/preview/mixkit-cat-walk-371.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-sunny',
    style: 'cute',
    title: 'Sunny',
    url: 'https://assets.mixkit.co/music/preview/mixkit-sunny-717.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-deep-urban',
    style: 'dance',
    title: 'Deep Urban',
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-serene',
    style: 'chill',
    title: 'Serene View',
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-relax-beat',
    style: 'lofi',
    title: 'Relaxing in the Forest',
    url: 'https://assets.mixkit.co/music/preview/mixkit-relaxing-in-the-forest-338.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-jazzy-keys',
    style: 'jazz',
    title: 'Jazz Hot',
    url: 'https://assets.mixkit.co/music/preview/mixkit-jazz-hot-110.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-guitar-ballad',
    style: 'ballad',
    title: 'Beautiful Dream',
    url: 'https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-493.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-driving',
    style: 'rock',
    title: 'Driving Ambition',
    url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-cantopop-bright',
    style: 'cantopop',
    title: 'Island Beat',
    url: 'https://assets.mixkit.co/music/preview/mixkit-island-beat-150.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-hazy-after-hours',
    style: 'chill',
    title: 'Hazy After Hours',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-games-worldbeat',
    style: 'dance',
    title: 'Games Worldbeat',
    url: 'https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-feeling-happy',
    style: 'cute',
    title: 'Feeling Happy',
    url: 'https://assets.mixkit.co/music/preview/mixkit-feeling-happy-5.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-life-is-a-dream',
    style: 'pop',
    title: 'Life Is a Dream',
    url: 'https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-826.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-bridge-samurai',
    style: 'electronic',
    title: 'Bridge of the Samurai',
    url: 'https://assets.mixkit.co/music/preview/mixkit-bridge-of-the-samurai-122.mp3',
    durationMs: 72_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
  {
    id: 'mix-sleepy-cat',
    style: 'lofi',
    title: 'Sleepy Cat',
    url: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    durationMs: 90_000,
    license: 'Mixkit-Free',
    credit: 'Mixkit',
    source: 'https://mixkit.co/free-stock-music/',
  },
];

/** Local performance-clip style strings that pair with a MusicStyleId. */
export const STYLE_CLIP_HINTS: Record<MusicStyleId, string[]> = {
  pop: ['cheerful pop', 'upbeat dance', 'cute tease'],
  cantopop: ['cheerful pop', 'cute tease', 'soft ballad'],
  jazz: ['soft ballad', 'chill'],
  lofi: ['chill', 'lofi'],
  hiphop: ['upbeat dance', 'cute bounce'],
  electronic: ['upbeat dance', 'cheerful pop'],
  ballad: ['soft ballad', 'chill'],
  rock: ['upbeat dance', 'cheerful pop'],
  dance: ['upbeat dance', 'cute bounce'],
  chill: ['chill', 'soft ballad'],
  cute: ['cute bounce', 'cute tease', 'cheerful pop'],
  default: [],
};

/** Procedural WebAudio theme id for a style (falls back to default). */
export const STYLE_THEME_ID: Record<MusicStyleId, string> = {
  pop: 'marin',
  cantopop: 'juno',
  jazz: 'juno',
  lofi: 'luna',
  hiphop: 'ruby',
  electronic: 'marin',
  ballad: 'mochi',
  rock: 'anchor',
  dance: 'ruby',
  chill: 'luna',
  cute: 'mochi',
  default: 'default',
};

export function tracksForStyle(style: MusicStyleId): StreamTrack[] {
  if (style === 'default') return [...STREAM_TRACKS];
  const hits = STREAM_TRACKS.filter((t) => t.style === style);
  return hits.length ? hits : STREAM_TRACKS.filter((t) => t.style === 'pop' || t.style === 'dance');
}

/** Pick a royalty-free stream URL for a style, or null if none. */
export function resolveStreamPlaylist(style?: string): string | null {
  if (!style) return null;
  const id = (STYLE_PATTERNS.some((p) => p.id === style) ? style : detectMusicStyle(style)) as
    | MusicStyleId
    | undefined;
  if (!id) return null;
  const pool = tracksForStyle(id);
  if (!pool.length) return null;
  // Stable-ish rotation from style string length
  const n = style.length + id.length;
  return pool[n % pool.length]!.url;
}

export function pickStreamTrack(style: MusicStyleId | undefined, n = 0): StreamTrack | null {
  const pool = tracksForStyle(style ?? 'default');
  if (!pool.length) return null;
  return pool[Math.abs(n) % pool.length]!;
}

/** Exact Mixkit/PD track when the user picked from a select offer. */
export function streamTrackById(id: string | undefined | null): StreamTrack | null {
  if (!id) return null;
  return STREAM_TRACKS.find((t) => t.id === id) ?? null;
}
