// Music / song ask routing — random autoplay by default; selection UI only
// when the user explicitly asks to choose / list / pick.
// Catalog: Mixkit stream beds (music-catalog) + local performance clips.

import {
  detectMusicStyle,
  STREAM_TRACKS,
  tracksForStyle,
  type MusicStyleId,
  type StreamTrack,
} from './music-catalog';
import {
  PERFORMANCE_CLIPS,
  type PerformanceClip,
  type PerformanceKind,
  type SingVoice,
} from './performance-clips';

export type MusicAskMode = 'random' | 'select' | 'none';
export type MusicAskKind = 'music' | 'song' | 'dance';

export interface MusicAskIntent {
  mode: MusicAskMode;
  kind: MusicAskKind;
  /** Named genre when the user asked for one (jazz / lofi / chill…). */
  style?: MusicStyleId;
  matched: boolean;
}

export interface MusicPickOption {
  id: string;
  title: string;
  /** Genre label for speech / chips (style id or clip.style). */
  genre: string;
  kind: PerformanceKind;
  source: 'stream' | 'clip';
  /** Stream track id when source is stream. */
  streamId?: string;
  /** Local performance clip id when source is clip. */
  clipId?: string;
  styleHint?: MusicStyleId | string;
}

const SELECT_RE =
  /\b(?:let\s+me\s+(?:choose|pick|select)|(?:i\s+)?want\s+to\s+(?:choose|pick|select)|(?:you\s+)?(?:choose|pick|select)\s+(?:a\s+)?(?:song|track|tune|genre)|what\s+(?:\w+\s+){0,3}(?:songs?|tracks?|tunes?|music|genres?)\s+(?:do\s+you\s+have|have\s+you|can\s+you)|(?:list|show(?:\s+me)?)\s+(?:the\s+)?(?:songs?|tracks?|tunes?|playlist|genres?|music)|pick\s+(?:one|a\s+song|a\s+track)|which\s+(?:song|track|tune))\b|選歌|选歌|揀歌|拣歌|選曲|选曲|選一首|选一首|讓我選|让我选|俾我揀|给我选|有咩歌|有什么歌|有哪些歌|列(?:一列|出)?(?:歌|曲)|曲を選|曲をえら|どれにする|なにがある|何がある|ジャンルを選|プレイリスト/i;

const SING_RE =
  /(唱歌|唱首歌|唱一首|唱k|一齊唱|一齐唱|唱吓|唱啊|唱啦|唱個|唱个|\bsing(?:ing)?\b|\bkaraoke\b|カラオケ|歌を歌|うたって)/i;

const DANCE_RE =
  /(跳舞|舞蹈|跳個舞|跳支舞|舞一段|\bdanc(?:e|ing)\b|ダンス|踊って|踊ろう)/i;

const MUSIC_RE =
  /\b(?:play\s+(?:(?:some|a)\s+)?(?:music|song|track|tune)|put\s+on\s+(?:(?:some|a)\s+)?(?:music|song|track|tune)|play\s+(?:something|a\s+(?:song|track|tune))|listen\s+to\s+(?:(?:some|a)\s+)?(?:music|song)|(?:some\s+)?music\s+please)\b|播音樂|播音乐|放音樂|放音乐|播首歌|放首歌|播首|放首|來首|来首|播点|放点|音楽をかけ|音楽かけて|曲をかけ|聴かせて/i;

function askKind(text: string): MusicAskKind {
  if (SING_RE.test(text)) return 'song';
  if (DANCE_RE.test(text)) return 'dance';
  // "choose a song" / "what songs" without the verb "sing"
  if (/\bsongs?\b|唱歌|首歌|の曲|歌を/i.test(text) && !/\bmusic\b|音樂|音乐|音楽/i.test(text)) {
    return 'song';
  }
  return 'music';
}

/**
 * Classify a user line for music/sing/dance.
 * - random: generic play / sing / genre play → autoplay a pick
 * - select: explicit choose / list / what songs → offer names (no forced picker otherwise)
 * - none: not a music ask
 */
export function resolveMusicAsk(text: string): MusicAskIntent {
  const t = text.trim();
  if (!t) return { mode: 'none', kind: 'music', matched: false };

  const style = detectMusicStyle(t);
  const wantsSelect = SELECT_RE.test(t);
  const wantsSing = SING_RE.test(t);
  const wantsDance = DANCE_RE.test(t);
  const wantsMusic = MUSIC_RE.test(t);
  // "play jazz" / "put on lofi" — play verb + named genre, even when the
  // noun is the style word rather than "music/song".
  const playVerb =
    /\b(?:play|put\s+on|listen\s+to)\b|播|放|來首|来首|かけ|聴かせ/i.test(t);
  const genrePlay = !!(style && playVerb);

  // Explicit select/list — SELECT_RE is already music/song oriented
  // (choose a song, 選一首, playlist, what tracks…).
  if (wantsSelect) {
    return { mode: 'select', kind: askKind(t), style, matched: true };
  }

  if (wantsSing || wantsDance || wantsMusic || genrePlay) {
    return {
      mode: 'random',
      kind: wantsSing ? 'song' : wantsDance ? 'dance' : 'music',
      style,
      matched: true,
    };
  }

  // Bare genre word alone is not an ask.
  return { mode: 'none', kind: 'music', style, matched: false };
}

function styleLabel(style: string): string {
  return style.replace(/[-_]/g, ' ').trim() || 'music';
}

function streamOption(track: StreamTrack): MusicPickOption {
  return {
    id: `stream:${track.id}`,
    title: track.title,
    genre: styleLabel(track.style),
    kind: 'dance',
    source: 'stream',
    streamId: track.id,
    styleHint: track.style,
  };
}

function clipOption(clip: PerformanceClip): MusicPickOption {
  return {
    id: clip.id,
    title: clip.labels.en,
    genre: styleLabel(clip.style),
    kind: clip.kind,
    source: 'clip',
    clipId: clip.id,
    styleHint: clip.style,
  };
}

function rotate<T>(items: readonly T[], seed: number): T[] {
  if (!items.length) return [];
  const start = Math.abs(seed) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Named options for the selection sheet / spoken list.
 * Music/dance → royalty-free stream catalog (short free beds).
 * Song → gendered local CC0 vocal clips.
 * Genre filter when `style` is set; otherwise a mixed handful.
 */
export function listMusicPickOptions(opts: {
  kind: MusicAskKind;
  style?: MusicStyleId;
  count?: number;
  gender?: SingVoice;
  seed?: number;
}): MusicPickOption[] {
  const count = Math.max(2, Math.min(opts.count ?? 3, 5));
  const seed = opts.seed ?? 0;

  if (opts.kind === 'song') {
    let pool = PERFORMANCE_CLIPS.filter((c) => c.kind === 'song' && c.durationMs >= 8_000);
    if (opts.gender === 'female' || opts.gender === 'male') {
      const voiced = pool.filter((c) => c.voice === opts.gender);
      if (voiced.length) pool = voiced;
    }
    if (opts.style) {
      const needle = opts.style.toLowerCase();
      const styled = pool.filter(
        (c) =>
          c.style.toLowerCase().includes(needle) ||
          (needle === 'chill' && /chill|soft|ballad|lofi/i.test(c.style)) ||
          (needle === 'ballad' && /ballad|soft|chill/i.test(c.style)) ||
          (needle === 'pop' && /pop|cheer|cute/i.test(c.style)) ||
          (needle === 'cute' && /cute|cheer/i.test(c.style)),
      );
      if (styled.length) pool = styled;
    }
    return rotate(pool, seed).slice(0, count).map(clipOption);
  }

  const pool = opts.style ? tracksForStyle(opts.style) : [...STREAM_TRACKS];
  if (!opts.style) {
    const seen = new Set<string>();
    const diverse: StreamTrack[] = [];
    for (const t of rotate(pool, seed)) {
      if (seen.has(t.style)) continue;
      seen.add(t.style);
      diverse.push(t);
      if (diverse.length >= count) break;
    }
    if (diverse.length < count) {
      for (const t of rotate(pool, seed + 7)) {
        if (diverse.some((d) => d.id === t.id)) continue;
        diverse.push(t);
        if (diverse.length >= count) break;
      }
    }
    return diverse.map(streamOption);
  }
  return rotate(pool, seed).slice(0, count).map(streamOption);
}

/** Spoken menu of song names / genres — chips optional alongside. */
export function musicSelectOfferLine(lang: string, options: MusicPickOption[]): string {
  const parts = options.map((o) => `${o.title} (${o.genre})`);
  const L =
    lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'en';
  if (!parts.length) {
    if (L === 'yue') return '我而家未諗到歌——你講個風格我再播？';
    if (L === 'zh') return '我暂时没想到歌——你说个风格我再放？';
    if (L === 'ja') return 'いま思い浮かばないな——ジャンルを教えて？';
    return 'I do not have a list handy — tell me a genre?';
  }
  if (parts.length === 1) {
    if (L === 'yue') return `得！不如聽「${parts[0]}」？`;
    if (L === 'zh') return `好！要不要听「${parts[0]}」？`;
    if (L === 'ja') return `じゃあ「${parts[0]}」どう？`;
    return `How about "${parts[0]}"?`;
  }
  const head = parts.slice(0, -1).join('、');
  const last = parts[parts.length - 1]!;
  if (L === 'yue') return `得！你揀啦——${head}，定「${last}」？`;
  if (L === 'zh') return `好！你来选——${head}，还是「${last}」？`;
  if (L === 'ja') return `うん、選んでね——${head}、それとも「${last}」？`;
  const enHead = parts.slice(0, -1).join(', ');
  return `Sure — pick one: ${enHead}, or ${last}.`;
}

/** Fresh rotation seed for random autoplay (not laugh-counter lockstep). */
export function randomMusicSeed(): number {
  return Math.floor(Math.random() * 10_000) + Date.now();
}

/** Map ask kind → beginShow performance kind. */
export function musicAskShowKind(kind: MusicAskKind): PerformanceKind {
  return kind === 'song' ? 'song' : 'dance';
}
