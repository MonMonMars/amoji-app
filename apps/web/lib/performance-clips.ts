// Premade sing + dance library. Pure data — no audio, no DOM.
// Short CC0 / public-domain clips (MP3, so iPhone can decode them) live in
// public/audio/library. Songs have a female or a male voice and use dialogue
// volume. Dance tracks and instrumental beds use BGM volume.
// License notes: public/audio/library/LIBRARY.md

export type PerformanceKind = 'song' | 'dance';
export type PerformanceLang = 'en' | 'yue' | 'zh' | 'ja';
export type PerformanceVolume = 'voiceVol' | 'bgmVol';
export type SingVoice = 'female' | 'male';
export type ClipLicense = 'CC0-1.0' | 'PD';

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
  license: ClipLicense;
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
    id: 'dance-8bit-disco-loop',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/library/dance-8bit-disco-loop.mp3', durationMs: 15386,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('8-bit Disco'), license: 'CC0-1.0',
    credit: 'cosmac', source: 'https://opengameart.org/content/8-bit-disco-loop',
  },
  {
    id: 'dance-boss-battle-2-metal-preview',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/library/dance-boss-battle-2-metal-preview.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Boss Battle'), license: 'CC0-1.0',
    credit: 'AntumDeluge', source: 'https://opengameart.org/content/boss-battle-2-symphonic-metal',
  },
  {
    id: 'dance-chiptune-minstrel-dance-1',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/library/dance-chiptune-minstrel-dance-1.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Minstrel Dance'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/chiptune-medieval-minstrel-dance',
  },
  {
    id: 'dance-dance-field',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/library/dance-dance-field.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Dance Field'), license: 'CC0-1.0',
    credit: 'Centurion_of_war', source: 'https://opengameart.org/content/dance-field',
  },
  {
    id: 'dance-happy-loop',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/dance-happy-loop.mp3', durationMs: 18051,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Loop'), license: 'CC0-1.0',
    credit: 'wipics', source: 'https://opengameart.org/content/happy-loop',
  },
  {
    id: 'dance-twin-layers',
    kind: 'dance', style: 'upbeat dance',
    file: '/audio/library/dance-twin-layers.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy', 'angry', 'sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Twin Layers'), license: 'CC0-1.0',
    credit: 'Umplix', source: 'https://opengameart.org/content/dance-music-pack',
  },
  {
    id: 'bed-002-synthwave-15k',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-002-synthwave-15k.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Synthwave'), license: 'CC0-1.0',
    credit: 'Majadroid', source: 'https://opengameart.org/content/calm-ambient-2-synthwave-15k',
  },
  {
    id: 'bed-002-synthwave-15k-0',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-002-synthwave-15k-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Synthwave II'), license: 'CC0-1.0',
    credit: 'Majadroid', source: 'https://opengameart.org/content/calm-ambient-2-synthwave-15k',
  },
  {
    id: 'bed-006-lifewave2k',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-006-lifewave2k.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lifewave'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-ambient-3-lifewave-2k',
  },
  {
    id: 'bed-006-lifewave2k-0',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-006-lifewave2k-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lifewave II'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-ambient-3-lifewave-2k',
  },
  {
    id: 'bed-007-synthwave-421k',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-007-synthwave-421k.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Synthwave Drift'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-relax-1-synthwave-421k',
  },
  {
    id: 'bed-8bit-bossa',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-8bit-bossa.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('8-bit Bossa'), license: 'CC0-1.0',
    credit: 'looneybits', source: 'https://opengameart.org/content/bossa-nova',
  },
  {
    id: 'bed-a-chill-fever',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-a-chill-fever.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Fever'), license: 'CC0-1.0',
    credit: 'Tsorthan Grove', source: 'https://opengameart.org/content/a-chill-fever-loopable',
  },
  {
    id: 'bed-a-chill-fever-0',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-a-chill-fever-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Fever II'), license: 'CC0-1.0',
    credit: 'Tsorthan Grove', source: 'https://opengameart.org/content/a-chill-fever-loopable',
  },
  {
    id: 'bed-bit-forrest-intro-0',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-bit-forrest-intro-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Bit Forest'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/bit-forest-intro',
  },
  {
    id: 'bed-breves-dies-hominis',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-breves-dies-hominis.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Breves Dies'), license: 'CC0-1.0',
    credit: 'hashcashbtcfundedart', source: 'https://opengameart.org/content/breves-dies-hominis',
  },
  {
    id: 'bed-cakeflaps-cate',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-cakeflaps-cate.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Cate'), license: 'CC0-1.0',
    credit: 'Saa_Matt', source: 'https://opengameart.org/content/cate',
  },
  {
    id: 'bed-cakeflaps-cate-0',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-cakeflaps-cate-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Cate II'), license: 'CC0-1.0',
    credit: 'Saa_Matt', source: 'https://opengameart.org/content/cate',
  },
  {
    id: 'bed-caketown',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-caketown.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Caketown'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/caketown',
  },
  {
    id: 'bed-calm-theme',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-calm-theme.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Calm Theme'), license: 'CC0-1.0',
    credit: 'pebonius', source: 'https://opengameart.org/content/calm-theme',
  },
  {
    id: 'bed-chilllofir',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-chilllofir.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Lofi'), license: 'CC0-1.0',
    credit: 'isaiah658', source: 'https://opengameart.org/content/chill-lofi-inspired',
  },
  {
    id: 'bed-chilllofir-0',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-chilllofir-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Lofi II'), license: 'CC0-1.0',
    credit: 'isaiah658', source: 'https://opengameart.org/content/chill-lofi-inspired',
  },
  {
    id: 'bed-chillloopable',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-chillloopable.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Loop'), license: 'CC0-1.0',
    credit: 'Tsorthan Grove', source: 'https://opengameart.org/content/chill-loopable',
  },
  {
    id: 'bed-chillloopable-0',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-chillloopable-0.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Loop II'), license: 'CC0-1.0',
    credit: 'Tsorthan Grove', source: 'https://opengameart.org/content/chill-loopable',
  },
  {
    id: 'bed-flowerbed',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-flowerbed.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Flowerbed'), license: 'CC0-1.0',
    credit: 'Zane Little Music', source: 'https://opengameart.org/content/flowerbed-fields-loop',
  },
  {
    id: 'bed-happy-adventure',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-happy-adventure.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Adventure'), license: 'CC0-1.0',
    credit: 'TinyWorlds', source: 'https://opengameart.org/content/happy-adventure-loop',
  },
  {
    id: 'bed-happy-vibes',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-happy-vibes.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Vibes'), license: 'CC0-1.0',
    credit: 'Ruskerdax', source: 'https://opengameart.org/content/happy-vibes',
  },
  {
    id: 'bed-jump',
    kind: 'dance', style: 'cheerful pop',
    file: '/audio/library/bed-jump.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Jump'), license: 'CC0-1.0',
    credit: 'ThePixel', source: 'https://opengameart.org/content/jump',
  },
  {
    id: 'bed-lifewave',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-lifewave.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Life Wave'), license: 'CC0-1.0',
    credit: 'Snabisch', source: 'https://opengameart.org/content/calm-relax-1-synthwave-421k',
  },
  {
    id: 'bed-lofi',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-lofi.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lofi'), license: 'CC0-1.0',
    credit: 'omfgdude', source: 'https://opengameart.org/content/lofi-hip-hop',
  },
  {
    id: 'bed-lullaby',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-lullaby.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Lullaby'), license: 'CC0-1.0',
    credit: 'Pro Sensory (Alex McCulloch)', source: 'https://opengameart.org/content/lullaby-0',
  },
  {
    id: 'bed-menu-title',
    kind: 'dance', style: 'cheerful pop',
    file: '/audio/library/bed-menu-title.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Menu Title'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/menu-theme',
  },
  {
    id: 'bed-montage-music-20121120-162812',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-montage-music-20121120-162812.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Monster Montage'), license: 'CC0-1.0',
    credit: 'TinyWorlds', source: 'https://opengameart.org/content/42-monster-rpg-2-music-tracks',
  },
  {
    id: 'bed-musicbox1-spooky-waltz',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-musicbox1-spooky-waltz.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Spooky Waltz'), license: 'CC0-1.0',
    credit: 'Mjorlaja', source: 'https://opengameart.org/content/4-music-box-tracks',
  },
  {
    id: 'bed-musicbox2-cute-tune',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-musicbox2-cute-tune.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Cute Tune'), license: 'CC0-1.0',
    credit: 'Mjorlaja', source: 'https://opengameart.org/content/4-music-box-tracks',
  },
  {
    id: 'bed-myveryowndeadship',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-myveryowndeadship.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Dead Ship'), license: 'CC0-1.0',
    credit: 'qubodup', source: 'https://opengameart.org/content/background-space-track',
  },
  {
    id: 'bed-napping-on-a-cloud',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-napping-on-a-cloud.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious', 'happy'], langs: ALL, characters: [],
    labels: label('Napping on a Cloud'), license: 'CC0-1.0',
    credit: 'congusbongus', source: 'https://opengameart.org/content/napping-on-a-cloud',
  },
  {
    id: 'bed-neostead-breathing-1',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-neostead-breathing-1.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Breathing'), license: 'CC0-1.0',
    credit: 'greatnomadicseal', source: 'https://opengameart.org/content/breathing',
  },
  {
    id: 'bed-observingthestar',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-observingthestar.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Observing the Star'), license: 'CC0-1.0',
    credit: 'StumpyStrust', source: 'https://opengameart.org/content/another-space-background-track',
  },
  {
    id: 'bed-shenandoah',
    kind: 'dance', style: 'soft ballad',
    file: '/audio/library/bed-shenandoah.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Shenandoah'), license: 'CC0-1.0',
    credit: 'United States Air Force Concert Band (trad.)', source: 'https://commons.wikimedia.org/wiki/File:Shenandoah.ogg',
  },
  {
    id: 'bed-song',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-song.mp3', durationMs: 18860,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Beepbox'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/beepbox1',
  },
  {
    id: 'bed-song-0',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-song-0.mp3', durationMs: 18860,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Beepbox II'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/beepbox1',
  },
  {
    id: 'bed-space-background',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-space-background.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Space Background'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/space-background-music',
  },
  {
    id: 'bed-town-theme',
    kind: 'dance', style: 'cute bounce',
    file: '/audio/library/bed-town-theme.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Town Theme'), license: 'CC0-1.0',
    credit: 'unknown', source: 'https://opengameart.org/content/town-theme-rpg',
  },
  {
    id: 'bed-zombie-main-music',
    kind: 'dance', style: 'chill',
    file: '/audio/library/bed-zombie-main-music.mp3', durationMs: 20036,
    volume: 'bgmVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Chill Menu'), license: 'CC0-1.0',
    credit: 'WeaponGuy', source: 'https://opengameart.org/content/chill-main-menu-music',
  },
  {
    id: 'sing-f-adele-from-musical-adele-sung-by-sopran',
    kind: 'song', style: 'cheerful pop', voice: 'female',
    file: '/audio/library/sing-f-adele-from-musical-adele-sung-by-sopran.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'happy'], langs: ALL, characters: [],
    labels: label('Adele'), license: 'PD',
    credit: 'Adolf Philipp (January 29, 1864 – July 30, 1936), composer and lyricist Colum…', source: 'https://commons.wikimedia.org/wiki/File%3A%22Adele%22_from_musical_Adele%2C_sung_by_soprano_Agnes_Kimball.flac',
  },
  {
    id: 'sing-f-cantate',
    kind: 'song', style: 'chill', voice: 'female',
    file: '/audio/library/sing-f-cantate.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Cantate Domino'), license: 'CC0-1.0',
    credit: 'Anonymous Choir', source: 'https://commons.wikimedia.org/wiki/File:Anonymous_Choir_-_Cantate_Domino.ogg',
  },
  {
    id: 'sing-f-choir-chords',
    kind: 'song', style: 'soft ballad', voice: 'female',
    file: '/audio/library/sing-f-choir-chords.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Choir'), license: 'CC0-1.0',
    credit: 'cynicmusic', source: 'https://opengameart.org/content/epic-endgame-cinematic',
  },
  {
    id: 'sing-f-citation-sound-effect-the-english-word',
    kind: 'song', style: 'cute tease', voice: 'female',
    file: '/audio/library/sing-f-citation-sound-effect-the-english-word.mp3', durationMs: 1280,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Citation'), license: 'CC0-1.0',
    credit: 'Caroline Joy & Mike Morrison', source: 'https://commons.wikimedia.org/wiki/File%3ACitation_sound_effect_-_the_English_word_citation_sung_by_a_soprano_singer.wav',
  },
  {
    id: 'sing-f-hello-there',
    kind: 'song', style: 'cute tease', voice: 'female',
    file: '/audio/library/sing-f-hello-there.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Hello There'), license: 'CC0-1.0',
    credit: 'Pro Sensory (Alex McCulloch)', source: 'https://opengameart.org/content/hello-there-singing',
  },
  {
    id: 'sing-f-joy',
    kind: 'song', style: 'cheerful pop', voice: 'female',
    file: '/audio/library/sing-f-joy.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Joy to the World'), license: 'CC0-1.0',
    credit: 'Kim Butler, Alan Davis-Drake, Diyan, Claire Goget, Karen Savage, SKVE, Kara S…', source: 'https://commons.wikimedia.org/wiki/File:Joy-to-the-World_KB.ogg',
  },
  {
    id: 'sing-f-smiling-through',
    kind: 'song', style: 'cheerful pop', voice: 'female',
    file: '/audio/library/sing-f-smiling-through.mp3', durationMs: 45035,
    volume: 'voiceVol', moods: ['sad', 'tired', 'happy'], langs: ALL, characters: [],
    labels: label('Smiling Through'), license: 'PD',
    credit: 'Wikimedia Commons / US Government PD', source: 'https://commons.wikimedia.org/wiki/File%3APDP-CH_-_Jeanette_MacDonald%2C_Soprano_-_Smiling_through_-_1941_film_-_Herbert_Stothart_-_Hmv-c3284-2a061676.flac',
  },
  {
    id: 'sing-f-soave-sia-il-vento-from-cosi-fan-tutte',
    kind: 'song', style: 'soft ballad', voice: 'female',
    file: '/audio/library/sing-f-soave-sia-il-vento-from-cosi-fan-tutte.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Soave Sia Il Vento'), license: 'PD',
    credit: 'Wolfgang Amadeus Mozart</span', source: 'https://commons.wikimedia.org/wiki/File%3A%22Soave_Sia_Il_Vento%22_from_Cosi_Fan_Tutte_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-f-twinkle',
    kind: 'song', style: 'cute tease', voice: 'female',
    file: '/audio/library/sing-f-twinkle.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy', 'sad', 'tired'], langs: ALL, characters: [],
    labels: label('Twinkle Twinkle'), license: 'CC0-1.0',
    credit: 'Derrick Coetzee', source: 'https://commons.wikimedia.org/wiki/File:Twinkle_Twinkle_Little_Star_-_sung_with_full_lyrics.ogg',
  },
  {
    id: 'sing-f-una-voce-poco-fa-from-il-barbiere-di-si',
    kind: 'song', style: 'cheerful pop', voice: 'female',
    file: '/audio/library/sing-f-una-voce-poco-fa-from-il-barbiere-di-si.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'happy'], langs: ALL, characters: [],
    labels: label('Una Voce Poco Fa'), license: 'PD',
    credit: 'Gioachino Rossini', source: 'https://commons.wikimedia.org/wiki/File%3A%22Una_Voce_Poco_Fa%22_from_Il_Barbiere_Di_Siviglia_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-brindisi-from-la-traviata-singing-ser',
    kind: 'song', style: 'cheerful pop', voice: 'male',
    file: '/audio/library/sing-m-brindisi-from-la-traviata-singing-ser.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Brindisi'), license: 'PD',
    credit: 'Giuseppe Verdi', source: 'https://commons.wikimedia.org/wiki/File%3A%22Brindisi%22_from_La_Traviata_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-buddham',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/library/sing-m-buddham.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Buddham Saranam'), license: 'CC0-1.0',
    credit: 'Unknown (Wikimedia Commons CC0 upload)', source: 'https://commons.wikimedia.org/wiki/File:Buddham_Saranam_Gacchami_-_Male_Voice,_with_Female_Chorus.oga',
  },
  {
    id: 'sing-m-happy-birthday',
    kind: 'song', style: 'cute tease', voice: 'male',
    file: '/audio/library/sing-m-happy-birthday.mp3', durationMs: 14028,
    volume: 'voiceVol', moods: ['happy'], langs: ALL, characters: [],
    labels: label('Happy Birthday'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/joyeux-anniversaire-s2194.html',
  },
  {
    id: 'sing-m-mass',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/library/sing-m-mass.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Mass'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/mass-organ-and-singing-1-s2789.html',
  },
  {
    id: 'sing-m-mass-amen',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/library/sing-m-mass-amen.mp3', durationMs: 5172,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Mass Amen'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/mass-amen-s2790.html',
  },
  {
    id: 'sing-m-overtone-a',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/library/sing-m-overtone-a.mp3', durationMs: 13793,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Overtone A'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/overtone-singing-a-s3038.html',
  },
  {
    id: 'sing-m-overtone-c',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/library/sing-m-overtone-c.mp3', durationMs: 15047,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Overtone C'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/overtone-singing-c-s3033.html',
  },
  {
    id: 'sing-m-overtone-e',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/library/sing-m-overtone-e.mp3', durationMs: 18051,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Overtone E'), license: 'CC0-1.0',
    credit: 'Joseph Sardin (BigSoundBank)', source: 'https://bigsoundbank.com/overtone-singing-e-s3035.html',
  },
  {
    id: 'sing-m-quando-le-sere-al-placido-ferruccio-gia',
    kind: 'song', style: 'soft ballad', voice: 'male',
    file: '/audio/library/sing-m-quando-le-sere-al-placido-ferruccio-gia.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired'], langs: ALL, characters: [],
    labels: label('Quando le sere al placido'), license: 'PD',
    credit: 'Giuseppe Verdi, Ferruccio Giannini', source: 'https://commons.wikimedia.org/wiki/File%3A%22Quando_le_sere_al_placido%22_%28Ferruccio_Giannini%29.wav',
  },
  {
    id: 'sing-m-shenandoah-singing-sergeants-united',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/library/sing-m-shenandoah-singing-sergeants-united.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Shenandoah'), license: 'PD',
    credit: 'Composition: traditional', source: 'https://commons.wikimedia.org/wiki/File%3AShenandoah_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
  },
  {
    id: 'sing-m-tuvan-internationale-vocal-self-recorded',
    kind: 'song', style: 'chill', voice: 'male',
    file: '/audio/library/sing-m-tuvan-internationale-vocal-self-recorded.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['sad', 'tired', 'anxious'], langs: ALL, characters: [],
    labels: label('Tuvan Internationale'), license: 'CC0-1.0',
    credit: 'Cactus Ronin', source: 'https://commons.wikimedia.org/wiki/File%3ATuvan_Internationale_Vocal%2C_Self_Recorded.wav',
  },
  {
    id: 'sing-m-votre-toast-from-carmen-singing-serge',
    kind: 'song', style: 'upbeat dance', voice: 'male',
    file: '/audio/library/sing-m-votre-toast-from-carmen-singing-serge.mp3', durationMs: 20036,
    volume: 'voiceVol', moods: ['happy', 'angry'], langs: ALL, characters: [],
    labels: label('Votre Toast'), license: 'PD',
    credit: 'Georges Bizet', source: 'https://commons.wikimedia.org/wiki/File%3A%22Votre_Toast%22_from_Carmen_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
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
