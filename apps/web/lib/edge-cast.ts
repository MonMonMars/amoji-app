// Per-character Edge voice. The free read-aloud list does not have one
// unique neural voice per companion in every language (zh-HK has two female
// voices and one male; ja-JP has one of each). Every roster id still gets
// its own slot: a gender-correct voice, then a pitch and pace no other
// character in that language shares. Web Speech uses the same pitch and pace.

import { CHARACTERS } from './prefs';
import type { VoiceLocale } from './voice-catalog';

export interface EdgeCastVoice {
  id: string;
  ssmlLang: string;
  /** SSML pitch fraction, and speechSynthesis pitch offset from ~1. */
  pitch: number;
  /** SSML rate fraction, and speechSynthesis rate offset from ~1. */
  rate: number;
}

interface PoolVoice {
  id: string;
  ssmlLang: string;
}

// Live consumer catalog (speech.platform.bing.com voices/list). Voices that
// are not on that list make the socket fail the whole line.
const POOLS: Record<VoiceLocale, { female: PoolVoice[]; male: PoolVoice[] }> = {
  yue: {
    female: [
      { id: 'zh-HK-HiuGaaiNeural', ssmlLang: 'zh-HK' },
      { id: 'zh-HK-HiuMaanNeural', ssmlLang: 'zh-HK' },
    ],
    male: [
      { id: 'zh-HK-WanLungNeural', ssmlLang: 'zh-HK' },
    ],
  },
  zh: {
    female: [
      { id: 'zh-CN-XiaoxiaoNeural', ssmlLang: 'zh-CN' },
      { id: 'zh-CN-XiaoyiNeural', ssmlLang: 'zh-CN' },
      { id: 'zh-TW-HsiaoChenNeural', ssmlLang: 'zh-TW' },
      { id: 'zh-TW-HsiaoYuNeural', ssmlLang: 'zh-TW' },
      { id: 'zh-CN-liaoning-XiaobeiNeural', ssmlLang: 'zh-CN-liaoning' },
      { id: 'zh-CN-shaanxi-XiaoniNeural', ssmlLang: 'zh-CN-shaanxi' },
    ],
    male: [
      { id: 'zh-CN-YunjianNeural', ssmlLang: 'zh-CN' },
      { id: 'zh-CN-YunxiNeural', ssmlLang: 'zh-CN' },
      { id: 'zh-CN-YunyangNeural', ssmlLang: 'zh-CN' },
      { id: 'zh-CN-YunxiaNeural', ssmlLang: 'zh-CN' },
      { id: 'zh-TW-YunJheNeural', ssmlLang: 'zh-TW' },
    ],
  },
  ja: {
    female: [{ id: 'ja-JP-NanamiNeural', ssmlLang: 'ja-JP' }],
    male: [{ id: 'ja-JP-KeitaNeural', ssmlLang: 'ja-JP' }],
  },
  en: {
    female: [
      'en-US-JennyNeural',
      'en-GB-SoniaNeural',
      'en-US-AriaNeural',
      'en-AU-NatashaNeural',
      'en-US-AnaNeural',
      'en-GB-LibbyNeural',
      'en-US-MichelleNeural',
      'en-IN-NeerjaNeural',
      'en-US-EmmaNeural',
      'en-IE-EmilyNeural',
      'en-US-AvaNeural',
      'en-NZ-MollyNeural',
      'en-HK-YanNeural',
      'en-CA-ClaraNeural',
      'en-SG-LunaNeural',
      'en-ZA-LeahNeural',
      'en-PH-RosaNeural',
      'en-GB-MaisieNeural',
      'en-KE-AsiliaNeural',
      'en-NG-EzinneNeural',
      'en-TZ-ImaniNeural',
    ].map(voice),
    male: [
      'en-US-GuyNeural',
      'en-GB-RyanNeural',
      'en-US-ChristopherNeural',
      'en-HK-SamNeural',
      'en-US-EricNeural',
      'en-AU-WilliamMultilingualNeural',
      'en-US-AndrewNeural',
      'en-GB-ThomasNeural',
      'en-US-BrianNeural',
      'en-IE-ConnorNeural',
      'en-US-RogerNeural',
      'en-US-SteffanNeural',
      'en-IN-PrabhatNeural',
      'en-CA-LiamNeural',
      'en-NZ-MitchellNeural',
      'en-SG-WayneNeural',
      'en-ZA-LukeNeural',
      'en-PH-JamesNeural',
      'en-KE-ChilembaNeural',
      'en-NG-AbeoNeural',
      'en-TZ-ElimuNeural',
    ].map(voice),
  },
};

function voice(id: string): PoolVoice {
  const parts = id.split('-');
  const ssmlLang = parts[0] === 'zh' && (parts[2] === 'liaoning' || parts[2] === 'shaanxi')
    ? `${parts[0]}-${parts[1]}-${parts[2]}`
    : `${parts[0]}-${parts[1]}`;
  return { id, ssmlLang };
}

// Pitch stays on the character's side of neutral. A positive lift on a male
// neural (WanLung especially) reads as female; a deep drop on a female neural
// reads as male. Pace still separates people who share one voice.
const FEMALE_PITCH = [0, 0.04, 0.08, 0.06, 0.1, 0.12, 0.02, 0.14, 0.16, 0.18];
const FEMALE_RATE = [0, 0.04, -0.04, 0.08, -0.06];
const MALE_PITCH = [0, -0.04, -0.08, -0.06, -0.1, -0.12, -0.02, -0.14];
const MALE_RATE = [0, -0.04, 0.04, -0.06, 0.06];

function combosFor(
  poolSize: number,
  count: number,
  pitches: readonly number[],
  rates: readonly number[],
): { pitch: number; rate: number }[] {
  for (let rateN = 1; rateN <= rates.length; rateN++) {
    for (let pitchN = 1; pitchN <= pitches.length; pitchN++) {
      if (poolSize * pitchN * rateN >= count) {
        const out: { pitch: number; rate: number }[] = [];
        for (let r = 0; r < rateN; r++) {
          for (let p = 0; p < pitchN; p++) out.push({ pitch: pitches[p]!, rate: rates[r]! });
        }
        return out;
      }
    }
  }
  throw new Error(`edge cast: ${count} characters and only ${poolSize} voices`);
}

function assign(
  ids: readonly string[],
  pool: readonly PoolVoice[],
  pitches: readonly number[],
  rates: readonly number[],
): Map<string, EdgeCastVoice> {
  const combos = combosFor(pool.length, ids.length, pitches, rates);
  const map = new Map<string, EdgeCastVoice>();
  ids.forEach((id, i) => {
    const picked = pool[i % pool.length]!;
    const combo = combos[Math.floor(i / pool.length)]!;
    map.set(id, { id: picked.id, ssmlLang: picked.ssmlLang, pitch: combo.pitch, rate: combo.rate });
  });
  return map;
}

const FEMALE_IDS = CHARACTERS.filter((c) => c.gender === 'female').map((c) => c.id).sort();
const MALE_IDS = CHARACTERS.filter((c) => c.gender === 'male').map((c) => c.id).sort();

// WanLung is the only male Cantonese neural. Positive pitch lifts him into
// a female range, so male slots stay at or below his natural pitch.
const YUE_MALE_PITCH = [0, -0.06, -0.1, -0.14, -0.04, -0.12];
const YUE_MALE_RATE = [0, -0.04, 0.04, -0.08, 0.06, 0];

function assignTuned(
  ids: readonly string[],
  pool: readonly PoolVoice[],
  pitches: readonly number[],
  rates: readonly number[],
): Map<string, EdgeCastVoice> {
  const map = new Map<string, EdgeCastVoice>();
  ids.forEach((id, i) => {
    const picked = pool[i % pool.length]!;
    map.set(id, {
      id: picked.id,
      ssmlLang: picked.ssmlLang,
      pitch: pitches[i % pitches.length]!,
      rate: rates[Math.floor(i / pitches.length) % rates.length]!,
    });
  });
  return map;
}

const CAST: Record<VoiceLocale, Map<string, EdgeCastVoice>> = {
  yue: merge(assign(FEMALE_IDS, POOLS.yue.female, FEMALE_PITCH, FEMALE_RATE), assignTuned(MALE_IDS, POOLS.yue.male, YUE_MALE_PITCH, YUE_MALE_RATE)),
  zh: merge(assign(FEMALE_IDS, POOLS.zh.female, FEMALE_PITCH, FEMALE_RATE), assign(MALE_IDS, POOLS.zh.male, MALE_PITCH, MALE_RATE)),
  ja: merge(assign(FEMALE_IDS, POOLS.ja.female, FEMALE_PITCH, FEMALE_RATE), assign(MALE_IDS, POOLS.ja.male, MALE_PITCH, MALE_RATE)),
  en: merge(assign(FEMALE_IDS, POOLS.en.female, FEMALE_PITCH, FEMALE_RATE), assign(MALE_IDS, POOLS.en.male, MALE_PITCH, MALE_RATE)),
};

function merge(a: Map<string, EdgeCastVoice>, b: Map<string, EdgeCastVoice>): Map<string, EdgeCastVoice> {
  return new Map([...a, ...b]);
}

function asLocale(locale: string): VoiceLocale {
  return locale === 'yue' || locale === 'zh' || locale === 'ja' || locale === 'en' ? locale : 'en';
}

/** Roster character → Edge voice for this app language. Null for legacy ids. */
export function edgeCastVoice(characterId: string, locale: string): EdgeCastVoice | null {
  return CAST[asLocale(locale)].get(characterId) ?? null;
}

export function edgeCastRoster(): readonly { id: string; gender: 'female' | 'male' }[] {
  return CHARACTERS.map((c) => ({ id: c.id, gender: c.gender }));
}
