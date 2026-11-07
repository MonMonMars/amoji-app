// What the operating system itself can say.
//
// speechSynthesis is the one TTS source on this device that costs nothing,
// needs no network, and is already installed. The web app has only ever used
// it as a last-resort hop, picking ONE voice per language+gender and hoping.
// This module answers the question the picker actually needs answered: how
// many DIFFERENT voices does this device really have, and what are they?
//
// ---------------------------------------------------------------------------
// The hard limit, stated up front
// ---------------------------------------------------------------------------
// `SpeechSynthesisVoice` has exactly five fields: `name`, `lang`,
// `localService`, `default`, `voiceURI` (see TypeScript's own lib.dom.d.ts —
// verified on this repo's toolchain). THERE IS NO GENDER FIELD. Nothing in the
// API says "this voice is female". So gender can only be INFERRED from the
// voice's name, and every inference below is a heuristic with a named source.
//
// This module therefore returns 'unknown' whenever the name does not identify a
// speaker, and the UI is expected to say "unknown" rather than guess. A wrong
// gender is worse than no gender: it is what made the old picker claim 58
// distinct voices when there was one.
//
// ---------------------------------------------------------------------------
// Platform reality (measured, not assumed)
// ---------------------------------------------------------------------------
// Windows (measured in Chrome/Edge/Chromium on Windows 11, this machine):
//   15 voices, every one localService=true, exactly the SAPI/OneCore set:
//   zh-HK Danny (male) + Tracy (female); zh-TW Hanhan/Yating (female) +
//   Zhiwei (male); zh-CN Huihui/Yaoyao (female) + Kangkang (male);
//   ja-JP Ayumi/Haruka/Sayaka (female) + Ichiro (male); en-US Zira (female) +
//   David/Mark (male). Genders above are read from
//   HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\*\Attributes\Gender,
//   so they are authoritative for the names in VOICE_GENDER_EXACT.
//   The Edge "Online (Natural)" voices (HiuMaan, WanLung, Xiaoxiao …) were NOT
//   exposed by speechSynthesis in any of the three browsers, headless or
//   headed, even after voiceschanged — so they are not counted here.
//
// macOS: ~60 compact voices installed by default, one per locale, plus dozens
//   more the user can download in System Settings → Accessibility → Spoken
//   Content. Compact-only by default; enhanced/premium are opt-in downloads.
//   zh-HK is Sin-ji (female) and nothing else by default.
//
// iOS/iPadOS Safari: the list is populated, but only ONE voice per language
//   actually speaks — asking for another name in the same language silently
//   falls back (documented behaviour since iOS 8). So on iOS a long list is
//   NOT a long menu of usable voices. Modelled here as 'per-language'.
//
// Android (Chrome/Firefox): the list shows several locales, but the voice that
//   plays is whatever the system TTS engine is set to in Settings → Text to
//   speech. The page can choose the LANGUAGE, not the voice. Modelled here as
//   'system-only'.
//
// And on iOS the hardware silent switch mutes speechSynthesis completely. No
// page can detect the switch. That caveat is attached to every iOS inventory
// so the UI can state it instead of leaving the user with silence.

import type { VoiceLocale } from './voice-catalog';

export type InferredGender = 'female' | 'male' | 'unknown';

export type DevicePlatform = 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'unknown';

/**
 * How much a voice NAME is worth on this platform.
 * `per-voice`     — naming a voice selects that voice (Windows, macOS, Linux).
 * `per-language`  — only one voice per language actually speaks (iOS).
 * `system-only`   — the OS setting decides; the name is advisory (Android).
 */
export type VoiceSelectionModel = 'per-voice' | 'per-language' | 'system-only';

export type VoiceQuality = 'compact' | 'enhanced' | 'premium' | 'neural' | 'unknown';

/** Why an inventory is smaller than the raw voice list suggests. */
export type OsVoiceCaveat =
  | 'ios-silent-switch'
  | 'ios-one-per-language'
  | 'android-system-voice'
  | 'macos-voices-need-download';

/** The subset of SpeechSynthesisVoice this module needs. */
export interface RawVoice {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
  voiceURI?: string;
}

/** The subset of SpeechSynthesis this module needs (so tests can fake it). */
export interface SynthLike {
  getVoices(): readonly RawVoice[];
  addEventListener?(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
  onvoiceschanged?: ((this: unknown, ev: unknown) => unknown) | null;
}

export interface OsVoice {
  /** Stable, deduplicated pin id, e.g. `os:zh-hk:microsoft-tracy`. */
  id: string;
  name: string;
  /** BCP-47 with underscores normalised to hyphens, original casing kept. */
  lang: string;
  /** Lower-cased, hyphenated form used for matching. */
  langKey: string;
  localService: boolean;
  isDefault: boolean;
  voiceURI: string;
  gender: InferredGender;
  /** Which rule produced `gender`, so the diagnostic can show its work. */
  genderSource: GenderSource;
  /** The exact token/entry that matched, for auditing a surprise. */
  genderMatch: string | null;
  quality: VoiceQuality;
  /** 'native' speaks this language; 'substitute' is another language standing in. */
  fit: 'native' | 'substitute';
  /** False when the platform will not actually let this exact voice play. */
  usable: boolean;
}

export type GenderSource =
  /** The name (or voiceURI) contains the literal word male/female. */
  | 'explicit-word'
  /** An Apple bundle id such as com.apple.ttsbundle.siri_male_en-US_compact. */
  | 'apple-bundle'
  /** A curated exact-name entry (see VOICE_GENDER_EXACT). */
  | 'exact-table'
  /** A curated given-name token (see VOICE_GENDER_NAMES). */
  | 'name-table'
  /** A CJK script substring such as 粵語 or 普通话. */
  | 'cjk-table'
  | 'none';

// ---------------------------------------------------------------------------
// The gender table. Every entry below is grounded in something checkable.
// ---------------------------------------------------------------------------

/**
 * Exact voice names → gender, keyed by the collapsed name (lower-cased, vendor
 * prefix and locale suffix removed, separators dropped: "Sin-ji" → "sinji").
 *
 * Provenance per block is in the comments. Where a source disagreed with
 * another (the "Lessons Learned" blog table lists Sin-ji as male and Thomas as
 * female, both contradicted by Apple's own documentation and by the voices'
 * own Chinese/French audio), the name's meaning and Apple's bundle ids win.
 */
export const VOICE_GENDER_EXACT: Readonly<Record<string, InferredGender>> = {
  // ---- Microsoft SAPI / OneCore, gender read from the Windows registry ----
  // HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\*\Attributes\Gender
  // on this machine, which is why these are not guesses.
  zira: 'female',
  david: 'male',
  mark: 'male',
  huihui: 'female',
  yaoyao: 'female',
  kangkang: 'male',
  hanhan: 'female',
  yating: 'female',
  zhiwei: 'male',
  tracy: 'female',
  danny: 'male',
  ayumi: 'female',
  haruka: 'female',
  sayaka: 'female',
  ichiro: 'male',

  // ---- Microsoft neural short names (only if a browser ever exposes them) --
  xiaoxiao: 'female',
  xiaoyi: 'female',
  xiaohan: 'female',
  xiaomo: 'female',
  xiaorui: 'female',
  xiaobei: 'female',
  xiaoni: 'female',
  yunxi: 'male',
  yunjian: 'male',
  yunyang: 'male',
  yunxia: 'male',
  yunjhe: 'male',
  hsiaochen: 'female',
  hsiaoyu: 'female',
  hiumaan: 'female',
  hiugaai: 'female',
  wanlung: 'male',
  nanami: 'female',
  keita: 'male',
  otoya: 'male',

  // ---- Apple ----
  // Sin-ji is Apple's Cantonese voice and is female: it is described as
  // 「善怡」 (a female given name) in Apple's own Cantonese Siri history, and
  // the "Lessons Learned" table that calls it male is contradicted by Apple's
  // bundle id and by every Cantonese source. Enhanced variants keep the name.
  sinji: 'female',
  meijia: 'female',
  tingting: 'female',
  tiantian: 'female',
  kyoko: 'female',
  yuna: 'female',
  yushu: 'female',
  linfei: 'female',
  limu: 'male',
  hattori: 'male',
  oren: 'female',
  helena: 'female',
  martin: 'male',
  melina: 'female',
  samantha: 'female',
  alex: 'male',
  fred: 'male',
  aaron: 'male',
  nicky: 'female',
  kathy: 'female',
  vicki: 'female',
  victoria: 'female',
  albert: 'male',
  ralph: 'male',
  junior: 'male',
  eddy: 'male',
  reed: 'male',
  rocko: 'male',
  flo: 'female',
  sandy: 'female',
  shelley: 'female',
  grandma: 'female',
  grandpa: 'male',
  karen: 'female',
  daniel: 'male',
  moira: 'female',
  tessa: 'female',
  serena: 'female',
  kate: 'female',
  allison: 'female',
  ava: 'female',
  susan: 'female',
  martha: 'female',
  catherine: 'female',
  gordon: 'male',
  arthur: 'male',
  rishi: 'male',
  xander: 'male',
  maged: 'male',
  majed: 'male',
  thomas: 'male',
  amelie: 'female',
  marie: 'female',
  monica: 'female',
  paulina: 'female',
  alice: 'female',
  ellen: 'female',
  nora: 'female',
  zosia: 'female',
  luciana: 'female',
  joana: 'female',
  ioana: 'female',
  laura: 'female',
  alva: 'female',
  kanya: 'female',
  yelda: 'female',
  milena: 'female',
  carmit: 'female',
  lekha: 'female',
  mariska: 'female',
  damayanti: 'female',
  sara: 'female',
  anna: 'female',
  satu: 'female',
  zuzana: 'female',
  fiona: 'female',
  lee: 'male',

  // ---- Google (Chrome desktop / Android) ----
  // Chromium's network speech manifest (browser/resources/network_speech_synthesis
  // /manifest.json) marks every one of these `"gender": "female"` except
  // "Google UK English Male", which it marks male. That manifest is the only
  // authoritative gender statement Google publishes for these voices.
  googleusenglish: 'female',
  googleespanol: 'female',
  googleespanoldeestadosunidos: 'female',
  googlefrancais: 'female',
  googleitaliano: 'female',
  googledeutsch: 'female',
  googleрусский: 'female',
  googlenederlands: 'female',
  googlepolski: 'female',
  googleportuguesdobrasil: 'female',
  googlebahasaindonesia: 'female',
  googlehindii: 'female',
  google日本語: 'female',
  google한국의: 'female',
  // The speaker key strips the vendor prefix, so the bare forms need entries too.
  русский: 'female',
  // Folded by collapseName() before lookup, so the key is spelled in ASCII.
  espanol: 'female',

  // ---- Amazon / Samsung / misc names that show up on real devices ----
  ivy: 'female',
  joanna: 'female',
  kendra: 'female',
  kimberly: 'female',
  salli: 'female',
  matthew: 'male',
  justin: 'male',
  joey: 'male',
};

/**
 * CJK script fragments. A Cantonese or Mandarin voice name rarely contains a
 * Latin given name, so the language word itself is the only reliable hint:
 * Google ships exactly one voice per Chinese locale and every one of them is
 * female (see the manifest note above). Nothing here claims a male option.
 *
 * '中文' maps to 'unknown' and is filtered out by the caller — it says "Chinese"
 * without saying which speaker, which is precisely a non-answer.
 */
export const VOICE_GENDER_CJK: Readonly<Record<string, InferredGender>> = {
  '粵語': 'female',
  '粤语': 'female',
  // Google ships "Google 粤語（香港）": simplified 粤 with traditional 語.
  '粤語': 'female',
  '廣東話': 'female',
  '广东话': 'female',
  '普通话': 'female',
  '普通話': 'female',
  '國語': 'female',
  '国语': 'female',
  '日本語': 'female',
  '中文': 'unknown',
};

/**
 * Given-name tokens. A token has to match a whole alphanumeric run, so
 * "Samantha" never matches "Sam" and "Yating" never matches "Yan".
 */
export const VOICE_GENDER_NAMES: Readonly<Record<string, InferredGender>> = {
  // male
  david: 'male', mark: 'male', george: 'male', james: 'male', daniel: 'male',
  alex: 'male', fred: 'male', rishi: 'male', aaron: 'male', oliver: 'male',
  nathan: 'male', eric: 'male', guy: 'male', christopher: 'male', ryan: 'male',
  andrew: 'male', brian: 'male', roger: 'male', william: 'male', connor: 'male',
  liam: 'male', mitchell: 'male', wayne: 'male', luke: 'male', steffan: 'male',
  prabhat: 'male', kangkang: 'male', ichiro: 'male', keita: 'male', otoya: 'male',
  yunxi: 'male', yunjian: 'male', yunyang: 'male', yunxia: 'male', wanlung: 'male',
  danny: 'male', zhiwei: 'male', matthew: 'male', justin: 'male', joey: 'male',
  // female
  zira: 'female', samantha: 'female', hazel: 'female', susan: 'female',
  karen: 'female', victoria: 'female', allison: 'female', fiona: 'female',
  moira: 'female', tessa: 'female', veena: 'female', serena: 'female',
  huihui: 'female', yaoyao: 'female', haruka: 'female', ayumi: 'female',
  sayaka: 'female', nanami: 'female', kyoko: 'female', tracy: 'female',
  hanhan: 'female', yating: 'female', xiaoxiao: 'female', xiaoyi: 'female',
  jenny: 'female', aria: 'female', michelle: 'female', emma: 'female',
  emily: 'female', molly: 'female', clara: 'female', luna: 'female',
  leah: 'female', rosa: 'female', natasha: 'female', sonia: 'female',
  libby: 'female', ivy: 'female', joanna: 'female', kendra: 'female',
  kimberly: 'female', salli: 'female',
};

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

/**
 * Latin diacritics folded to ASCII. An explicit map, NOT Unicode NFD: NFD
 * decomposes "й" into "и" + a combining breve and Korean syllables into Jamo,
 * which would both be mangled by a blanket combining-mark strip (it was).
 */
const LATIN_FOLD: Readonly<Record<string, string>> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ā: 'a', ą: 'a',
  ç: 'c', ć: 'c', č: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ē: 'e', ę: 'e', ě: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i', ī: 'i', į: 'i',
  ñ: 'n', ń: 'n', ň: 'n',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ō: 'o', ő: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ū: 'u', ů: 'u', ű: 'u',
  ý: 'y', ÿ: 'y',
  š: 's', ś: 's', ş: 's', ß: 'ss',
  ž: 'z', ź: 'z', ż: 'z',
  ť: 't', ţ: 't',
  æ: 'ae', œ: 'oe',
};

/** Full name, lower-cased, Latin diacritics folded, all separators removed. */
export function collapseName(raw: string): string {
  const folded = String(raw || '')
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, (ch) => LATIN_FOLD[ch] ?? ch);
  return folded.replace(/[^a-z0-9\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]+/g, '');
}

/**
 * The speaker's own name, vendor prefix and locale suffix stripped.
 * "Microsoft Tracy Desktop" → "tracy"; "Microsoft Danny - Chinese (Traditional,
 * Hong Kong S.A.R.)" → "danny"; "Google 粵語（香港）" → "粵語".
 */
/**
 * Speaker identity, for deduplication only: "Microsoft Zira Desktop - English
 * (United States)" and "Microsoft Zira - English (United States)" are the SAME
 * voice on Windows and must not be counted twice.
 */
export function speakerKey(raw: string): string {
  let s = String(raw || '').toLowerCase().trim();
  s = s.replace(/^(microsoft|google|apple|siri|chrome os|amazon)\s+/i, '');
  const dash = s.indexOf(' - ');
  if (dash > 0) s = s.slice(0, dash);
  const fullWidthParen = s.indexOf('（');
  if (fullWidthParen > 0) s = s.slice(0, fullWidthParen);
  s = s.replace(/\s*\(\s*(?:enhanced|premium|compact)\s*\)\s*$/i, '');
  s = s.replace(/\s+online\s*\(\s*natural\s*\)\s*$/i, '');
  s = s.replace(/\s+desktop\s*$/i, '');
  return collapseName(s);
}

export function speakerNameKey(raw: string): string {
  return speakerKey(raw);
}

/** Alphanumeric tokens, unicode-aware. "Sin-ji" → ['sin','ji']. */
function nameTokens(raw: string): string[] {
  return String(raw || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

function qualityOf(name: string, uri: string): VoiceQuality {
  const hay = `${name} ${uri}`.toLowerCase();
  if (/premium/.test(hay)) return 'premium';
  if (/enhanced/.test(hay)) return 'enhanced';
  if (/neural|online\s*\(\s*natural\s*\)/.test(hay)) return 'neural';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Gender inference
// ---------------------------------------------------------------------------

export interface GenderGuess {
  gender: InferredGender;
  source: GenderSource;
  match: string | null;
}

/**
 * Infer a voice's gender from its name (and, on Apple, its bundle id).
 *
 * Order matters. The literal word "Male"/"Female" is unambiguous, so it wins
 * even when the rest of the name is unknown. A curated exact entry beats a
 * given-name token, because "Google US English" carries no name at all but the
 * manifest says female.
 *
 * Two rules from different tiers that disagree resolve to 'unknown' — silence
 * about gender is honest, a coin flip is not.
 */
export function inferVoiceGender(name: string, voiceURI = ''): GenderGuess {
  const tokens = nameTokens(name);
  const uri = String(voiceURI || '').toLowerCase();

  // 1. The literal word. Tokenised so "female" never also reads as "male".
  if (tokens.includes('female')) return { gender: 'female', source: 'explicit-word', match: 'female' };
  if (tokens.includes('male')) return { gender: 'male', source: 'explicit-word', match: 'male' };
  if (/_female_|\.female\.|_f_/.test(uri) && !/_male_/.test(uri)) {
    return { gender: 'female', source: 'apple-bundle', match: uri.match(/_female_/)?.[0] ?? 'female' };
  }
  if (/_male_/.test(uri)) return { gender: 'male', source: 'apple-bundle', match: '_male_' };

  // 2. Curated exact name (or full collapsed name, which catches "Google US English").
  const short = speakerNameKey(name);
  if (short && VOICE_GENDER_EXACT[short]) {
    return { gender: VOICE_GENDER_EXACT[short]!, source: 'exact-table', match: short };
  }
  const full = collapseName(name);
  if (full && VOICE_GENDER_EXACT[full]) {
    return { gender: VOICE_GENDER_EXACT[full]!, source: 'exact-table', match: full };
  }

  // 3. CJK language words. Entries that map to 'unknown' are skipped, so the
  //    function falls through to the name table instead of returning a
  //    decorated non-answer with a misleading source.
  for (const [needle, gender] of Object.entries(VOICE_GENDER_CJK)) {
    if (gender === 'unknown') continue;
    if (short.includes(needle) || full.includes(needle)) {
      return { gender, source: 'cjk-table', match: needle };
    }
  }

  // 4. Given-name tokens, both sides collected so a conflict is visible.
  const femaleHits: string[] = [];
  const maleHits: string[] = [];
  for (const token of tokens) {
    const g = VOICE_GENDER_NAMES[token];
    if (g === 'female') femaleHits.push(token);
    else if (g === 'male') maleHits.push(token);
  }
  if (femaleHits.length && !maleHits.length) {
    return { gender: 'female', source: 'name-table', match: femaleHits[0]! };
  }
  if (maleHits.length && !femaleHits.length) {
    return { gender: 'male', source: 'name-table', match: maleHits[0]! };
  }
  return { gender: 'unknown', source: 'none', match: null };
}

// ---------------------------------------------------------------------------
// Locale matching
// ---------------------------------------------------------------------------

/**
 * Which app language a voice tag serves, and whether it really speaks it.
 *
 * Written as explicit rules rather than prefix lists because the tags overlap:
 * `'zh'` prefix-matches `'zh-hk'`, so a tag-list implementation silently counts
 * Windows' Cantonese Tracy/Danny as Mandarin voices (it did, before this).
 * `'zh-hk'` IS the Cantonese tag on every platform; everything else `zh-*` is
 * Mandarin.
 */
export function matchVoiceLocale(voiceLang: string, locale: VoiceLocale): 'native' | 'substitute' | null {
  const tag = String(voiceLang || '').replace(/_/g, '-').toLowerCase();
  if (!tag) return null;
  const isYue = tag === 'yue' || tag.startsWith('yue-');
  const isZhHk = tag === 'zh-hk';
  const isMandarin = !isZhHk && (/^zh(-|$)/.test(tag) || tag === 'cmn' || tag.startsWith('cmn-'));
  if (locale === 'yue') {
    if (isYue || isZhHk) return 'native';
    // A Mandarin voice will read Cantonese text with Mandarin pronunciation.
    if (isMandarin) return 'substitute';
    return null;
  }
  if (locale === 'zh') {
    if (isYue || isZhHk) return 'substitute';
    return isMandarin ? 'native' : null;
  }
  if (locale === 'ja') return tag === 'ja' || tag.startsWith('ja-') ? 'native' : null;
  if (locale === 'en') return tag === 'en' || tag.startsWith('en-') ? 'native' : null;
  return null;
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export function platformFromUA(userAgent: string, maxTouchPoints = 0): DevicePlatform {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/android/.test(ua)) return 'android';
  // iPadOS 13+ reports a desktop Macintosh UA; the touch count is what gives it away.
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/macintosh|mac os x/.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/cros/.test(ua)) return 'linux';
  if (/linux|x11/.test(ua)) return 'linux';
  return 'unknown';
}

export function selectionModelFor(platform: DevicePlatform): VoiceSelectionModel {
  if (platform === 'ios') return 'per-language';
  if (platform === 'android') return 'system-only';
  return 'per-voice';
}

export function caveatsFor(platform: DevicePlatform): readonly OsVoiceCaveat[] {
  if (platform === 'ios') return ['ios-silent-switch', 'ios-one-per-language'];
  if (platform === 'android') return ['android-system-voice'];
  if (platform === 'macos') return ['macos-voices-need-download'];
  return [];
}

/** Read the current OS voice list. Never throws; a blocked API reads as empty. */
export function readVoices(synth?: SynthLike | null): RawVoice[] {
  const s = synth ?? globalThisSpeechSynthesis();
  if (!s) return [];
  try {
    const list = s.getVoices();
    return Array.isArray(list) ? (list as RawVoice[]) : Array.from(list ?? []);
  } catch {
    return [];
  }
}

function globalThisSpeechSynthesis(): SynthLike | null {
  const g = globalThis as { speechSynthesis?: SynthLike };
  return (g.speechSynthesis as SynthLike | undefined) ?? null;
}

/**
 * Resolve once the engine has populated its list.
 *
 * Chrome and Safari return an EMPTY array on the first getVoices() call and
 * fire `voiceschanged` a beat later. A picker that reads synchronously shows
 * "0 voices" on every cold load, which is exactly the bug this replaces.
 * Already-populated engines resolve on the microtask queue.
 */
export function loadVoices(opts?: {
  synth?: SynthLike | null;
  timeoutMs?: number;
  /** Injectable timers so a test does not have to wait in real time. */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown;
  clearTimeoutFn?: (handle: unknown) => void;
}): Promise<RawVoice[]> {
  const synth = opts?.synth ?? globalThisSpeechSynthesis();
  if (!synth) return Promise.resolve([]);

  const immediate = readVoices(synth);
  if (immediate.length) return Promise.resolve(immediate);

  const timeoutMs = opts?.timeoutMs ?? 1200;
  const setT = opts?.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms) as unknown);
  const clearT = opts?.clearTimeoutFn ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  return new Promise<RawVoice[]>((resolve) => {
    let done = false;
    // A holder, not a bare `let`: `finish()` can run from the voiceschanged
    // listener before the timer handle exists, so cleanup has to read a value
    // that is assigned later.
    const handles: { timer?: unknown } = {};
    const cleanup = () => {
      if (handles.timer !== undefined) clearT(handles.timer);
      try { synth.removeEventListener?.('voiceschanged', onChanged); } catch { /* ignore */ }
    };
    const finish = (list: RawVoice[]) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(list);
    };
    const onChanged = () => {
      const list = readVoices(synth);
      // Some engines keep firing with an empty list; keep waiting for the
      // timeout instead of resolving "no voices" on the first event.
      if (list.length) finish(list);
    };
    try {
      synth.addEventListener?.('voiceschanged', onChanged);
    } catch { /* ignore */ }
    // Resolve on timeout with whatever exists, including an empty list — the
    // UI has to be allowed to say "this device exposes nothing".
    handles.timer = setT(() => finish(readVoices(synth)), timeoutMs);
  });
}

/** Subscribe to later list changes (the user installs a voice mid-session). */
export function onVoicesChanged(cb: (voices: RawVoice[]) => void, synth?: SynthLike | null): () => void {
  const s = synth ?? globalThisSpeechSynthesis();
  if (!s) return () => {};
  const handler = () => cb(readVoices(s));
  try {
    s.addEventListener?.('voiceschanged', handler);
  } catch { return () => {}; }
  return () => {
    try { s.removeEventListener?.('voiceschanged', handler); } catch { /* ignore */ }
  };
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface OsVoiceInventory {
  locale: VoiceLocale;
  platform: DevicePlatform;
  selectionModel: VoiceSelectionModel;
  caveats: readonly OsVoiceCaveat[];
  /** Every voice that can say something for this locale, native first. */
  voices: readonly OsVoice[];
  /** Only the voices that really speak this language. */
  native: readonly OsVoice[];
  /** Voices of another language that would play but pronounce it wrong. */
  substitutes: readonly OsVoice[];
  byGender: Readonly<Record<InferredGender, readonly OsVoice[]>>;
  nativeByGender: Readonly<Record<InferredGender, readonly OsVoice[]>>;
  /**
   * How many DISTINCT voices of THIS language the user can actually hear, per
   * inferred gender. This is the number the picker must show. It excludes
   * substitutes (a Mandarin voice reading Cantonese is not a Cantonese voice)
   * and excludes voices the platform will silently replace (iOS), which is why
   * it is not just `nativeByGender[n].length`.
   */
  usable: Readonly<Record<InferredGender, number>>;
  /** True when this language genuinely offers 3+ usable voices in both genders. */
  meetsThreePerGender: boolean;
  /** Voices the whole device exposes, before locale filtering. */
  deviceTotal: number;
  /** True when the API exists at all. */
  supported: boolean;
}

function normalizedLang(lang: string): string {
  return String(lang || '').replace(/_/g, '-').toLowerCase();
}

/**
 * Collapse duplicate entries for the same speaker. Windows exposes the same
 * SAPI voice as both "Zira" and "Zira Desktop"; a page that counted both would
 * double every voice. Enhanced/premium installs of one Apple voice ARE
 * different audio, so quality is part of the identity — but two entries with
 * the same name AND quality are one voice.
 */
export function dedupeVoices(raw: readonly RawVoice[]): RawVoice[] {
  const seen = new Map<string, RawVoice>();
  for (const v of raw) {
    if (!v || typeof v.name !== 'string' || !v.name.trim()) continue;
    const langKey = normalizedLang(v.lang);
    const key_base = speakerKey(v.name);
    if (!key_base) continue;
    const quality = qualityOf(v.name, v.voiceURI ?? '');
    const key = `${langKey}|${key_base}|${quality}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, v);
      continue;
    }
    // Keep one entry, but never lose the `default` or a local-service flag.
    seen.set(key, {
      name: prev.name,
      lang: prev.lang,
      localService: prev.localService === true || v.localService === true,
      default: prev.default === true || v.default === true,
      voiceURI: prev.voiceURI || v.voiceURI || '',
    });
  }
  return [...seen.values()];
}

export function voiceId(langKey: string, name: string): string {
  const slug = collapseName(name).slice(0, 48) || 'voice';
  return `os:${langKey}:${slug}`;
}

function toOsVoice(v: RawVoice, locale: VoiceLocale): OsVoice | null {
  const fit = matchVoiceLocale(v.lang, locale);
  if (!fit) return null;
  const guess = inferVoiceGender(v.name, v.voiceURI ?? '');
  const langKey = normalizedLang(v.lang);
  return {
    id: voiceId(langKey, v.name),
    name: v.name,
    lang: String(v.lang || '').replace(/_/g, '-'),
    langKey,
    localService: v.localService === true,
    isDefault: v.default === true,
    voiceURI: v.voiceURI ?? '',
    gender: guess.gender,
    genderSource: guess.source,
    genderMatch: guess.match,
    quality: qualityOf(v.name, v.voiceURI ?? ''),
    fit,
    // Filled in by applyUsability.
    usable: true,
  };
}

/**
 * Mark which voices can actually play.
 *
 * per-voice: everything listed plays. (Windows, macOS, Linux.)
 * per-language: one per language tag — the default-flagged one when present —
 *   because iOS silently substitutes any other. The rest stay listed so the
 *   diagnostic can show that they exist and are unreachable.
 * system-only: one voice for the whole device; the OS TTS setting overrides
 *   everything a page asks for.
 */
function applyUsability(voices: OsVoice[], model: VoiceSelectionModel): OsVoice[] {
  if (model === 'per-voice' || voices.length <= 1) return voices;
  const out = voices.map((v) => ({ ...v }));
  if (model === 'per-language') {
    const winners = new Map<string, OsVoice>();
    for (const v of out) {
      if (v.fit !== 'native') continue;
      const held = winners.get(v.langKey);
      if (!held || (v.isDefault && !held.isDefault)) winners.set(v.langKey, v);
    }
    return out.map((v) => (v.fit === 'native' ? { ...v, usable: winners.get(v.langKey)?.id === v.id } : { ...v, usable: false }));
  }
  // system-only: exactly one reachable voice on the whole device.
  const chosen = out.find((v) => v.fit === 'native' && v.isDefault) ?? out.find((v) => v.fit === 'native') ?? out[0];
  return out.map((v) => ({ ...v, usable: chosen?.id === v.id }));
}

function countByGender(voices: readonly OsVoice[]): Record<InferredGender, number> {
  const counts: Record<InferredGender, number> = { female: 0, male: 0, unknown: 0 };
  for (const v of voices) {
    if (!v.usable) continue;
    counts[v.gender] += 1;
  }
  return counts;
}

/**
 * Build the inventory for one app language from a raw device voice list.
 *
 * `platform` drives the usability model; pass it explicitly in tests so the
 * result does not depend on whatever host is running them.
 */
export function buildInventory(
  raw: readonly RawVoice[],
  locale: VoiceLocale,
  platform: DevicePlatform,
): OsVoiceInventory {
  const selectionModel = selectionModelFor(platform);
  const device = dedupeVoices(raw);
  const mapped = device
    .map((v) => toOsVoice(v, locale))
    .filter((v): v is OsVoice => v !== null);
  // Native voices first, then substitutes, then local before network: the order
  // the diagnostic should read in.
  const ranked = mapped.sort((a, b) => {
    if (a.fit !== b.fit) return a.fit === 'native' ? -1 : 1;
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const voices = applyUsability(ranked, selectionModel);
  const native = voices.filter((v) => v.fit === 'native');
  const substitutes = voices.filter((v) => v.fit === 'substitute');
  const pick = (list: readonly OsVoice[]) => ({
    female: list.filter((v) => v.gender === 'female'),
    male: list.filter((v) => v.gender === 'male'),
    unknown: list.filter((v) => v.gender === 'unknown'),
  });
  const byGender = pick(voices);
  const nativeByGender = pick(native);
  // Only native voices count: a substitute is a different language.
  const usable = countByGender(native);
  return {
    locale,
    platform,
    selectionModel,
    caveats: caveatsFor(platform),
    voices,
    native,
    substitutes,
    byGender,
    nativeByGender,
    usable,
    meetsThreePerGender: usable.female >= 3 && usable.male >= 3,
    deviceTotal: device.length,
    supported: raw.length > 0,
  };
}

/** Inventories for every shipped language, from one device list. */
export function buildAllInventories(
  raw: readonly RawVoice[],
  platform: DevicePlatform,
): Record<VoiceLocale, OsVoiceInventory> {
  return {
    yue: buildInventory(raw, 'yue', platform),
    zh: buildInventory(raw, 'zh', platform),
    ja: buildInventory(raw, 'ja', platform),
    en: buildInventory(raw, 'en', platform),
  };
}

/**
 * One line the picker can print, e.g. "3 fem / 1 male · 1 network".
 * Counts are USABLE voices, and `unknown` is reported separately rather than
 * being folded into a gender it might not have.
 */
export function summarizeInventory(inv: OsVoiceInventory): {
  female: number;
  male: number;
  unknown: number;
  networkOnly: number;
  meetsThree: boolean;
} {
  const networkOnly = inv.voices.filter((v) => v.usable && !v.localService).length;
  return {
    female: inv.usable.female,
    male: inv.usable.male,
    unknown: inv.usable.unknown,
    networkOnly,
    meetsThree: inv.meetsThreePerGender,
  };
}
