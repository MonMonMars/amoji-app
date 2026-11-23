// Curated, keyless Jamendo catalog — the PRIMARY music source.
//
// WHY THIS EXISTS
// The dance / lip-sync feature has to read real audio samples
// (createMediaElementSource + AnalyserNode). That only works when the audio
// response carries CORS headers; otherwise the element goes SILENT when
// rerouted (see the comment in lib/music.ts above isSameOriginUrl). Jamendo's
// public storage host was probed on 2026-11-24 and DOES send
// `access-control-allow-origin: <the requesting origin>`, so these tracks can
// be analysed. That single fact is why Jamendo is the primary provider.
//
// WHY IT IS KEYLESS
// The owner's objection: "my app user will not login to that website". They
// are right. These URLs need NO client_id and NO account:
//   https://prod-1.storage.jamendo.com/?trackid=<id>&format=mp31
// The client_id is only needed for *search* (lib/music-stream-providers.ts),
// which is an optional, developer-registered nicety — end users never see it.
//
// HOW EACH ROW WAS VERIFIED (do not add a row without doing this)
//   1. GET the storage URL with `Range: bytes=0-...` -> 206 (or 200) and
//      `access-control-allow-origin` present.
//   2. Parse the MP3's ID3v2 frames for the REAL TIT2 (title), TPE1 (artist),
//      TCON (genre), TCOP (CC licence URL) and the Xing/Info frame count for
//      duration. This is the file's own metadata, not a guess.
//   3. Cross-check https://www.jamendo.com/track/<id> -> 200 and its
//      og:title matches "<artist> - <title>". Rows whose page 404s, whose
//      artist disagrees, or that embed megabytes of album art were DROPPED
//      (see docs/MUSIC_STREAMING.md for the rejects and why).
//
// ATTRIBUTION IS A LICENCE OBLIGATION. Most rows are CC BY-NC-*; the `licence`
// and `licenceUrl` fields must stay attached to whatever the UI shows. Never
// strip them to make a label shorter.

/** One hand-verified keyless Jamendo track. */
export interface CuratedJamendoTrack {
  /** Jamendo track id (the only thing the storage URL needs) */
  id: string;
  title: string;
  artist: string;
  /** exact, from the MP3 Xing/Info frame count. null = unknown */
  durationSec: number | null;
  /** the file's own ID3 TCON value, lowercased. null = the file had none */
  genre: string | null;
  /** lettering as found in the file's TCOP frame, e.g. "CC BY-SA 3.0" */
  licence: string;
  licenceUrl: string;
}

/**
 * The one host whose CORS behaviour has been verified for this catalog.
 * Adding a host here without re-running the probe is how the app goes silent.
 */
export const JAMENDO_STORAGE_HOST = 'prod-1.storage.jamendo.com';

/** The exact URL shape every id below was probed with (mp31 = ~96 kbps). */
export function jamendoStreamUrl(id: string): string {
  return `https://${JAMENDO_STORAGE_HOST}/?trackid=${encodeURIComponent(id)}&format=mp31`;
}

/**
 * Probe evidence, 2026-11-24, from the owner's Windows machine.
 * A plain GET and a GET with `Origin: https://monmonmars.github.io` both
 * returned this header (it reflects the caller's origin):
 *   access-control-allow-origin: https://monmonmars.github.io
 */
export const JAMENDO_STORAGE_PROBE = {
  checkedOn: '2026-11-24',
  status: 206,
  accessControlAllowOrigin: 'https://monmonmars.github.io',
  contentType: 'audio/mpeg',
} as const;

/** 28 tracks, every id individually probed (see the header). */
export const JAMENDO_CURATED_TRACKS: readonly CuratedJamendoTrack[] = [
  {
    id: '8888',
    title: 'Dub\'n Khmer',
    artist: 'Stygmate',
    durationSec: 321,
    genre: null,
    licence: 'CC BY-ND 2.5',
    licenceUrl: 'http://creativecommons.org/licenses/by-nd/2.5/',
  },
  {
    id: '654467',
    title: 'Lit de parade',
    artist: 'CHASMA',
    durationSec: 195,
    genre: null,
    licence: 'CC BY-SA 2.5',
    licenceUrl: 'http://creativecommons.org/licenses/by-sa/2.5/se/',
  },
  {
    id: '776462',
    title: 'Infinite Loop',
    artist: 'Figures in Motion',
    durationSec: 324,
    genre: null,
    licence: 'CC BY 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by/3.0/',
  },
  {
    id: '843579',
    title: 'C Est Moi Le Pauvre',
    artist: 'Les Résidus Plasmiques',
    durationSec: 181,
    genre: null,
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    id: '888397',
    title: 'Waves',
    artist: 'Small Scale Revolution',
    durationSec: 94,
    genre: null,
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    id: '993073',
    title: 'Strange Electronic and Brass Drum and Bass',
    artist: 'Dajte Grammy',
    durationSec: 98,
    genre: 'drumnbass, electronic',
    licence: 'CC BY-NC-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
  },
  {
    id: '1040042',
    title: 'Le domaine des carpes',
    artist: 'Time Sequencers',
    durationSec: 403,
    genre: 'ambiant',
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    id: '1072508',
    title: 'The Moment Of Light',
    artist: 'BILLY KORG',
    durationSec: 187,
    genre: null,
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    id: '1120043',
    title: 'Oh baby',
    artist: 'Armando Lagozza',
    durationSec: 173,
    genre: 'indie, pop',
    licence: 'CC BY-NC-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
  },
  {
    id: '1215937',
    title: 'akustische Seele',
    artist: 'Uwe Haupt',
    durationSec: 181,
    genre: 'chillout',
    licence: 'CC BY-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nd/3.0/',
  },
  {
    id: '1282341',
    title: 'Lonely Planet',
    artist: 'DJ Frankie Holmes',
    durationSec: 224,
    genre: 'electronic',
    licence: 'CC BY 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by/3.0/',
  },
  {
    id: '1319502',
    title: 'Wanna See You',
    artist: 'Niki J Crawford',
    durationSec: 249,
    genre: 'rnb',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1337756',
    title: 'Junior Italy',
    artist: 'Evesent',
    durationSec: 94,
    genre: 'pop',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1388694',
    title: '2AM',
    artist: 'Blaine T. Goodwin',
    durationSec: 120,
    genre: 'chillout',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1464238',
    title: 'Transfer',
    artist: 'Defenix 21',
    durationSec: 293,
    genre: 'deephouse',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1470768',
    title: 'Echo Chamber (dry mix)',
    artist: 'Christian Zell',
    durationSec: 253,
    genre: 'filmscore, chillout',
    licence: 'CC BY 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by/3.0/',
  },
  {
    id: '1486484',
    title: 'The Predilection-SLMR',
    artist: 'The Predilection',
    durationSec: 151,
    genre: 'hiphop',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1493736',
    title: 'Aftermath',
    artist: 'The ARTISANS Beats',
    durationSec: 233,
    genre: 'synthwave',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1524636',
    title: 'Life is Beautiful | Happy Inspirational',
    artist: 'ANtarcticbreeze',
    durationSec: 256,
    genre: 'poprock',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1532301',
    title: 'Fashion Luxury',
    artist: 'TimTaj',
    durationSec: 150,
    genre: 'house, pop',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1555709',
    title: 'Cyber Creature',
    artist: 'Jake Beyond',
    durationSec: 256,
    genre: 'synthwave',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1588292',
    title: 'Long Funky Nights',
    artist: 'Funkilla',
    durationSec: 70,
    genre: null,
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1610421',
    title: 'Chrysophylax',
    artist: 'Eidunn',
    durationSec: 244,
    genre: 'trap',
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    id: '1662028',
    title: 'LOVABLE',
    artist: 'hantell',
    durationSec: 243,
    genre: 'smoothjazz',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '1943821',
    title: 'DJ FARG',
    artist: 'Dareius',
    durationSec: 143,
    genre: 'electronic',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '2151520',
    title: 'Mediterranea',
    artist: 'piccadillyCircus',
    durationSec: 230,
    genre: 'gypsy, latin',
    licence: 'CC BY-NC-SA 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
  },
  {
    id: '2311861',
    title: 'Funky Trap',
    artist: 'Jackson Frost',
    durationSec: 91,
    genre: 'trap, hiphop',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
  {
    id: '2347616',
    title: 'Bob',
    artist: 'Airbox',
    durationSec: 302,
    genre: 'reggae',
    licence: 'CC BY-NC-ND 3.0',
    licenceUrl: 'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  },
];

/**
 * Genre tag -> the two buckets the product cares about ("dance with her" vs
 * "calm background"). Deliberately conservative: an unmapped tag returns
 * null rather than a guess, because a wrong guess would pick a wind-down
 * track for a dance and look broken.
 *
 * Honest limit: these are the artists' own ID3 tags, NOT auditions. Nobody
 * has listened to all 28 and confirmed the tempo.
 */
const UPBEAT = [
  'dance', 'dancehall', 'deephouse', 'house', 'electronic', 'electronica', 'edm', 'techno',
  'trance', 'synthwave', 'synthpop', 'breakbeat', 'drumnbass', 'trap', 'hiphop', 'rap',
  'rnb', 'pop', 'poprock', 'indie', 'funk', 'disco', 'reggae', 'latin', 'gypsy',
  'corporate', 'rock',
];
const CALM = [
  'chill', 'chillout', 'chillwave', 'ambient', 'ambiant', 'lounge', 'filmscore', 'downtempo',
  'smoothjazz', 'acidjazz', 'jazz', 'classical', 'piano', 'acoustic', 'dub', 'world',
];

export type CuratedMood = 'upbeat' | 'calm';

export function moodForGenre(genre: string | null): CuratedMood | null {
  if (!genre) return null;
  const tags = genre
    .toLowerCase()
    .split(/[,;/&]/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const tag of tags) {
    if (UPBEAT.includes(tag)) return 'upbeat';
    if (CALM.includes(tag)) return 'calm';
  }
  return null;
}

/** The curated rows for one mood bucket (unmapped genres are excluded). */
export function curatedTracksForMood(mood: CuratedMood): readonly CuratedJamendoTrack[] {
  return JAMENDO_CURATED_TRACKS.filter((t) => moodForGenre(t.genre) === mood);
}
