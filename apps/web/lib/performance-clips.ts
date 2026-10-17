// Premade sing + dance library. Pure data — no audio, no DOM.
// Short CC0 clips (MP3 transcodes of the Free Music Maker ogg previews)
// live under public/audio/{dance,song-bed,sing-female,sing-male}.
// Songs use dialogue volume and match the companion's gender.
// Dance tracks and instrumental beds use BGM volume.
// License: public/audio/LIBRARY.md (CC0 only; no CC-BY).

export type PerformanceKind = 'song' | 'dance';
export type PerformanceLang = 'en' | 'yue' | 'zh' | 'ja';
export type PerformanceVolume = 'voiceVol' | 'bgmVol';
export type SingVoice = 'female' | 'male';

export interface PerformanceClip {
  id: string;
  kind: PerformanceKind;
  style: string;
  /** path under the site root (assetUrl prepends the Pages base) */
  file: string;
  durationMs: number;
  /** songs are dialogue; dance / beds are BGM */
  volume: PerformanceVolume;
  /** felt-mood tags (memory.ts detectMood) */
  moods: string[];
  langs: PerformanceLang[];
  characters: string[];
  /** sung voice. Dance and beds leave this unset. */
  voice?: SingVoice;
  labels: Record<PerformanceLang, string>;
  license: 'CC0-1.0';
  credit: string;
  source: string;
}

/** master gain before the stepped volume and any dialogue duck */
export const CLIP_BASE_GAIN: Record<PerformanceKind, number> = {
  song: 0.92,
  dance: 0.8,
};

const ALL: PerformanceLang[] = ['en', 'yue', 'zh', 'ja'];

function label(en: string): Record<PerformanceLang, string> {
  return { en, yue: en, zh: en, ja: en };
}

export const PERFORMANCE_CLIPS: readonly PerformanceClip[] = [
  {
    id: 'dance-silent-dance-floor',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-silent-dance-floor.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Silent Dance Floor'), license: 'CC0-1.0',
    credit: 'Umplix', source: 'https://opengameart.org/content/dance-music-pack',
  },
  {
    id: 'dance-cant-resist',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-cant-resist.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Can\'t Resist the Groove'), license: 'CC0-1.0',
    credit: 'Umplix', source: 'https://opengameart.org/content/dance-music-pack',
  },
  {
    id: 'dance-twin-layers',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-twin-layers.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry', 'sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Twin Layers'), license: 'CC0-1.0',
    credit: 'Umplix', source: 'https://opengameart.org/content/dance-music-pack',
  },
  {
    id: 'dance-celebrity',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-celebrity.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('The Celebrity'), license: 'CC0-1.0',
    credit: 'Umplix', source: 'https://opengameart.org/content/dance-music-pack',
  },
  {
    id: 'dance-happy-loop',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/dance/dance-happy-loop.mp3', durationMs: 18051,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Loop'), license: 'CC0-1.0',
    credit: 'wipics', source: 'https://opengameart.org/content/happy-loop',
  },
  {
    id: 'bed-banana',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-banana.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Banana Track'), license: 'CC0-1.0',
    credit: 'skrjablin', source: 'https://opengameart.org/content/banana-track',
  },
  {
    id: 'bed-flowerbed',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-flowerbed.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Flowerbed'), license: 'CC0-1.0',
    credit: 'Zane Little Music', source: 'https://opengameart.org/content/flowerbed-fields-loop',
  },
  {
    id: 'bed-jump',
    kind: 'dance', style: 'cheerful pop',
    file: '/audio/song-bed/bed-jump.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Jump'), license: 'CC0-1.0',
    credit: 'ThePixel', source: 'https://opengameart.org/content/jump',
  },
  {
    id: 'bed-happy-adventure',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-happy-adventure.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Adventure'), license: 'CC0-1.0',
    credit: 'TinyWorlds', source: 'https://opengameart.org/content/happy-adventure-loop',
  },
  {
    id: 'bed-lullaby',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-lullaby.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lullaby'), license: 'CC0-1.0',
    credit: 'Pro Sensory (Alex McCulloch)', source: 'https://opengameart.org/content/lullaby-0',
  },
  {
    id: 'bed-calm',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-calm.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Calm Theme'), license: 'CC0-1.0',
    credit: 'pebonius', source: 'https://opengameart.org/content/calm-theme',
  },
  {
    id: 'bed-lofi',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-lofi.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lofi'), license: 'CC0-1.0',
    credit: 'omfgdude', source: 'https://opengameart.org/content/lofi-hip-hop',
  },
  {
    id: 'bed-shenandoah',
    kind: 'dance', style: 'soft ballad',
    file: '/audio/song-bed/bed-shenandoah.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Shenandoah'), license: 'CC0-1.0',
    credit: 'United States Air Force Concert Band (trad.)', source: 'https://commons.wikimedia.org/wiki/File:Shenandoah.ogg',
  },
  {
    id: 'sing-f-hello',
    kind: 'song', style: 'cute tease', voice: 'female',
    file: '/audio/sing-female/sing-f-hello.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Hello There'), license: 'CC0-1.0',
    credit: 'Pro Sensory (Alex McCulloch)', source: 'https://opengameart.org/content/hello-there-singing',
  },
  {
    id: 'sing-f-twinkle',
    kind: 'song', style: 'cute tease', voice: 'female',
    file: '/audio/sing-female/sing-f-twinkle.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy', 'sad', 'tired'], langs: ALL, characters: [],
    labels: label('Twinkle Twinkle'), license: 'CC0-1.0',
    credit: 'Derrick Coetzee', source: 'https://commons.wikimedia.org/wiki/File:Twinkle_Twinkle_Little_Star_-_sung_with_full_lyrics.ogg',
  },
  {
    id: 'sing-f-joy',
    kind: 'song', style: 'cheerful pop', voice: 'female',
    file: '/audio/sing-female/sing-f-joy.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Joy to the World'), license: 'CC0-1.0',
    credit: 'Kim Butler, Alan Davis-Drake, Diyan, Claire Goget, Karen Savage, SKVE, Kara Shallenberg, Kristin Hughes', source: 'https://commons.wikimedia.org/wiki/File:Joy-to-the-World_KB.ogg',
  },
  {
    id: 'sing-f-choir',
    kind: 'song', style: 'soft ballad', voice: 'female',
    file: '/audio/sing-female/sing-f-choir.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Choir'), license: 'CC0-1.0',
    credit: 'cynicmusic', source: 'https://opengameart.org/content/epic-endgame-cinematic',
  },
  {
    id: 'sing-f-cantate',
    kind: 'song', style: 'chill', voice: 'female',
    file: '/audio/sing-female/sing-f-cantate.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Cantate Domino'), license: 'CC0-1.0',
    credit: 'Anonymous Choir', source: 'https://commons.wikimedia.org/wiki/File:Anonymous_Choir_-_Cantate_Domino.ogg',
  },
  {
    id: 'sing-m-happy-birthday',
    kind: 'song', style: 'cute tease', voice: 'male',
    file: '/audio/sing-male/sing-m-happy-birthday.mp3', durationMs: 14028,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Birthday'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/joyeux-anniversaire-s2194.html',
  },
  {
    id: 'sing-m-buddham',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/sing-male/sing-m-buddham.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Buddham Saranam'), license: 'CC0-1.0',
    credit: 'Unknown (Wikimedia Commons CC0 upload)', source: 'https://commons.wikimedia.org/wiki/File:Buddham_Saranam_Gacchami_-_Male_Voice,_with_Female_Chorus.oga',
  },
  {
    id: 'sing-m-mass',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/sing-male/sing-m-mass.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Mass'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/mass-organ-and-singing-1-s2789.html',
  },
  {
    id: 'sing-m-overtone-e',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/sing-male/sing-m-overtone-e.mp3', durationMs: 18051,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Overtone E'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/overtone-singing-e-s3035.html',
  },
  {
    id: 'sing-m-overtone-c',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/sing-male/sing-m-overtone-c.mp3', durationMs: 15047,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Overtone C'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/overtone-singing-c-s3033.html',
  },
];

const VOICE_WORD: Record<SingVoice, Record<PerformanceLang, string>> = {
  female: { en: 'female', yue: '女聲', zh: '女声', ja: '女性' },
  male: { en: 'male', yue: '男聲', zh: '男声', ja: '男性' },
};

/** On-screen name. Songs include the sung voice so the pick is obvious. */
export function clipLabel(clip: PerformanceClip, lang: string): string {
  const key: PerformanceLang = lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'en';
  const name = clip.labels[key] ?? clip.labels.en;
  if (!clip.voice) return name;
  return `${name} · ${VOICE_WORD[clip.voice][key]}`;
}

export interface ClipQuery {
  kind: PerformanceKind;
  lang?: string;
  mood?: string;
  characterId?: string;
  /** companion gender — songs use this voice when a matching clip exists */
  gender?: SingVoice;
  /** rotation counter — repeated asks walk the weighted pool */
  n?: number;
}

/**
 * Pick a clip. A matching mood narrows the pool. For songs, the companion's
 * gender narrows it again to the female or male voice when that voice exists.
 * Language and character add weight but never lock the pool to one file,
 * unless only one clip matches the mood and voice.
 */
export function pickPerformanceClip(q: ClipQuery): PerformanceClip {
  const bank = PERFORMANCE_CLIPS.filter((c) => c.kind === q.kind);
  const moodHits = q.mood ? bank.filter((c) => c.moods.includes(q.mood!)) : [];
  let pool = moodHits.length ? moodHits : bank;
  if (q.kind === 'song' && (q.gender === 'female' || q.gender === 'male')) {
    const voiced = pool.filter((c) => c.voice === q.gender);
    if (voiced.length) pool = voiced;
  }
  const weighted: PerformanceClip[] = [];
  for (const clip of pool) {
    let w = 1;
    if (q.lang && (clip.langs as readonly string[]).includes(q.lang)) w += 1;
    if (q.characterId && clip.characters.includes(q.characterId)) w += 1;
    for (let i = 0; i < w; i++) weighted.push(clip);
  }
  const n = Math.abs(q.n ?? 0);
  return weighted[n % weighted.length] ?? bank[0]!;
}

/** linear gain for a clip at a settings step (20–100) and an optional duck */
export function performanceGain(clip: PerformanceClip, step: number, duck = 1): number {
  const k = Math.max(0, Math.min(100, step)) / 100;
  return CLIP_BASE_GAIN[clip.kind] * k * Math.max(0, duck);
}
