// Premade sing + dance library. Pure data — no audio, no DOM.
// Short CC0 clips (MP3 transcodes of the Free Music Maker ogg previews,
// original set plus pack v2) live under
// public/audio/{dance,song-bed,sing-female,sing-male}.
// Songs use dialogue volume and match the companion's gender.
// Dance tracks and instrumental beds use BGM volume.
// Pack v2 entries are appended so rotation index 0 stays the original first clip.
// License: public/audio/LIBRARY.md (CC0 / public domain only; no CC-BY).

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
  {
    id: 'dance-boss-battle',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-boss-battle.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Boss Battle'), license: 'CC0-1.0',
    credit: 'AntumDeluge', source: 'https://opengameart.org/content/boss-battle-2-symphonic-metal',
  },
  {
    id: 'dance-minstrel',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-minstrel.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Minstrel Dance'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/chiptune-medieval-minstrel-dance',
  },
  {
    id: 'dance-field',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-field.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Dance Field'), license: 'CC0-1.0',
    credit: 'Centurion_of_war', source: 'https://opengameart.org/content/dance-field',
  },
  {
    id: 'dance-8bit-disco',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/dance/dance-8bit-disco.mp3', durationMs: 15386,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('8-Bit Disco'), license: 'CC0-1.0',
    credit: 'cosmac', source: 'https://opengameart.org/content/8-bit-disco-loop',
  },
  {
    id: 'bed-musicbox-waltz',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-musicbox-waltz.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Spooky Waltz'), license: 'CC0-1.0',
    credit: 'Mjorlaja', source: 'https://opengameart.org/content/4-music-box-tracks',
  },
  {
    id: 'bed-musicbox-tune',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-musicbox-tune.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Music Box'), license: 'CC0-1.0',
    credit: 'Mjorlaja', source: 'https://opengameart.org/content/4-music-box-tracks',
  },
  {
    id: 'bed-montage',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-montage.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Montage'), license: 'CC0-1.0',
    credit: 'TinyWorlds', source: 'https://opengameart.org/content/42-monster-rpg-2-music-tracks',
  },
  {
    id: 'bed-chill-fever',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-chill-fever.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Fever'), license: 'CC0-1.0',
    credit: 'Tsorthan Grove', source: 'https://opengameart.org/content/a-chill-fever-loopable',
  },
  {
    id: 'bed-observing-star',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-observing-star.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Observing the Star'), license: 'CC0-1.0',
    credit: 'StumpyStrust', source: 'https://opengameart.org/content/another-space-background-track',
  },
  {
    id: 'bed-deadship',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-deadship.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Deadship'), license: 'CC0-1.0',
    credit: 'qubodup', source: 'https://opengameart.org/content/background-space-track',
  },
  {
    id: 'bed-beepbox',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-beepbox.mp3', durationMs: 18860,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Beepbox'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/beepbox1',
  },
  {
    id: 'bed-bit-forest',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-bit-forest.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Bit Forest'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/bit-forest-intro',
  },
  {
    id: 'bed-8bit-bossa',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-8bit-bossa.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('8-Bit Bossa'), license: 'CC0-1.0',
    credit: 'looneybits', source: 'https://opengameart.org/content/bossa-nova',
  },
  {
    id: 'bed-breathing',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-breathing.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Breathing'), license: 'CC0-1.0',
    credit: 'greatnomadicseal', source: 'https://opengameart.org/content/breathing',
  },
  {
    id: 'bed-breves',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-breves.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Breves Dies'), license: 'CC0-1.0',
    credit: 'hashcashbtcfundedart', source: 'https://opengameart.org/content/breves-dies-hominis',
  },
  {
    id: 'bed-synthwave-15k',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-synthwave-15k.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Synthwave'), license: 'CC0-1.0',
    credit: 'Majadroid', source: 'https://opengameart.org/content/calm-ambient-2-synthwave-15k',
  },
  {
    id: 'bed-synthwave-15k-ii',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-synthwave-15k-ii.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Synthwave II'), license: 'CC0-1.0',
    credit: 'Majadroid', source: 'https://opengameart.org/content/calm-ambient-2-synthwave-15k',
  },
  {
    id: 'bed-lifewave-2k',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-lifewave-2k.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lifewave'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-ambient-3-lifewave-2k',
  },
  {
    id: 'bed-lifewave',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-lifewave.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lifewave Drift'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-relax-1-synthwave-421k',
  },
  {
    id: 'bed-synthwave-421',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-synthwave-421.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Synthwave Drift'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-relax-1-synthwave-421k',
  },
  {
    id: 'bed-cate',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-cate.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Cate'), license: 'CC0-1.0',
    credit: 'Saa_Matt', source: 'https://opengameart.org/content/cate',
  },
  {
    id: 'bed-chill-lofi',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-chill-lofi.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Lofi'), license: 'CC0-1.0',
    credit: 'isaiah658', source: 'https://opengameart.org/content/chill-lofi-inspired',
  },
  {
    id: 'bed-chill-loop',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-chill-loop.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Loop'), license: 'CC0-1.0',
    credit: 'Tsorthan Grove', source: 'https://opengameart.org/content/chill-loopable',
  },
  {
    id: 'bed-chill-menu',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-chill-menu.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Menu'), license: 'CC0-1.0',
    credit: 'WeaponGuy', source: 'https://opengameart.org/content/chill-main-menu-music',
  },
  {
    id: 'bed-happy-vibes',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-happy-vibes.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Vibes'), license: 'CC0-1.0',
    credit: 'Ruskerdax', source: 'https://opengameart.org/content/happy-vibes',
  },
  {
    id: 'bed-napping',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-napping.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Napping'), license: 'CC0-1.0',
    credit: 'congusbongus', source: 'https://opengameart.org/content/napping-on-a-cloud',
  },
  {
    id: 'bed-town',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-town.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Town Theme'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/town-theme-rpg',
  },
  {
    id: 'bed-space',
    kind: 'dance', style: 'chill',
    file: '/audio/song-bed/bed-space.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Space'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/space-background-music',
  },
  {
    id: 'bed-menu',
    kind: 'dance', style: 'cheerful pop',
    file: '/audio/song-bed/bed-menu.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Menu Title'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/menu-theme',
  },
  {
    id: 'bed-caketown',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/song-bed/bed-caketown.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Caketown'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/caketown',
  },
  {
    id: 'sing-f-citation',
    kind: 'song', style: 'cute tease', voice: 'female',
    file: '/audio/sing-female/sing-f-citation.mp3', durationMs: 1280,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Citation'), license: 'CC0-1.0',
    credit: 'Caroline Joy & Mike Morrison', source: 'https://commons.wikimedia.org/wiki/File:Citation_sound_effect_-_the_English_word_citation_sung_by_a_soprano_singer.wav',
  },
  {
    id: 'sing-f-adele',
    kind: 'song', style: 'soft ballad', voice: 'female',
    file: '/audio/sing-female/sing-f-adele.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy', 'sad', 'tired'], langs: ALL, characters: [],
    labels: label('Adele'), license: 'CC0-1.0',
    credit: 'Agnes Kimball; Adolf Philipp (Columbia Records, 1913)', source: 'https://commons.wikimedia.org/wiki/File:%22Adele%22_from_musical_Adele,_sung_by_soprano_Agnes_Kimball.flac',
  },
  {
    id: 'sing-f-una-voce',
    kind: 'song', style: 'soft ballad', voice: 'female',
    file: '/audio/sing-female/sing-f-una-voce.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy', 'sad', 'tired'], langs: ALL, characters: [],
    labels: label('Una Voce'), license: 'CC0-1.0',
    credit: 'Gioachino Rossini; Singing Sergeants, United States Air Force Band', source: 'https://commons.wikimedia.org/wiki/File:%22Una_Voce_Poco_Fa%22_from_Il_Barbiere_Di_Siviglia_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-f-soave',
    kind: 'song', style: 'soft ballad', voice: 'female',
    file: '/audio/sing-female/sing-f-soave.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Soave'), license: 'CC0-1.0',
    credit: 'Wolfgang Amadeus Mozart; Singing Sergeants, United States Air Force Band', source: 'https://commons.wikimedia.org/wiki/File:%22Soave_Sia_Il_Vento%22_from_Cosi_Fan_Tutte_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-shenandoah',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/sing-male/sing-m-shenandoah.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Shenandoah'), license: 'CC0-1.0',
    credit: 'United States Air Force Band, Singing Sergeants (trad.; arr. Floyd Werle, Michael Davis)', source: 'https://commons.wikimedia.org/wiki/File:Shenandoah_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-brindisi',
    kind: 'song', style: 'cheerful pop', voice: 'male',
    file: '/audio/sing-male/sing-m-brindisi.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Brindisi'), license: 'CC0-1.0',
    credit: 'Giuseppe Verdi; Singing Sergeants, United States Air Force Band', source: 'https://commons.wikimedia.org/wiki/File:%22Brindisi%22_from_La_Traviata_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-votre-toast',
    kind: 'song', style: 'cheerful pop', voice: 'male',
    file: '/audio/sing-male/sing-m-votre-toast.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Votre Toast'), license: 'CC0-1.0',
    credit: 'Georges Bizet; Singing Sergeants, United States Air Force Band', source: 'https://commons.wikimedia.org/wiki/File:%22Votre_Toast%22_from_Carmen_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-quando',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/sing-male/sing-m-quando.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Quando'), license: 'CC0-1.0',
    credit: 'Giuseppe Verdi, Ferruccio Giannini', source: 'https://commons.wikimedia.org/wiki/File:%22Quando_le_sere_al_placido%22_(Ferruccio_Giannini).wav',
  },
  {
    id: 'sing-m-tuvan',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/sing-male/sing-m-tuvan.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Tuvan'), license: 'CC0-1.0',
    credit: 'Cactus Ronin', source: 'https://commons.wikimedia.org/wiki/File:Tuvan_Internationale_Vocal,_Self_Recorded.wav',
  },
  {
    id: 'sing-m-overtone-a',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/sing-male/sing-m-overtone-a.mp3', durationMs: 13793,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Overtone A'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/overtone-singing-a-s3038.html',
  },
  {
    id: 'sing-m-mass-amen',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/sing-male/sing-m-mass-amen.mp3', durationMs: 5172,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Mass Amen'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/mass-amen-s2790.html',
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
  /** Instrumental song-bed only. Sung tracks stay on kind song. */
  bed?: boolean;
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
  if (q.bed) {
    const beds = pool.filter((c) => c.file.includes('/song-bed/'));
    if (beds.length) pool = beds;
  }
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
  // Invalid / 0 used to mute. Steps are 20–100; anything else → 80.
  const safe = step === 20 || step === 40 || step === 60 || step === 80 || step === 100 ? step : 80;
  const k = safe / 100;
  return CLIP_BASE_GAIN[clip.kind] * k * Math.max(0, duck);
}
