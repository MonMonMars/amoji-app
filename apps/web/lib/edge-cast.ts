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
      'en-US-AvaMultilingualNeural',
      'en-SG-LunaNeural',
      'en-US-EmmaMultilingualNeural',
      'en-ZA-LeahNeural',
      'en-PH-RosaNeural',
      'en-GB-MaisieNeural',
      'en-KE-AsiliaNeural',
      'en-NG-EzinneNeural',
      'en-TZ-ImaniNeural',
      'en-IN-NeerjaExpressiveNeural',
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
      'en-US-AndrewMultilingualNeural',
      'en-US-BrianMultilingualNeural',
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

// Wide enough that one Japanese voice can still give every companion a
// different pitch/pace, and that a repeated English voice sits a clear
// step away from the first character who uses it.
const PITCH_STEPS = [0, 0.12, -0.12, 0.18, -0.18, 0.06, -0.06, 0.1, -0.1, 0.16, -0.16];
const RATE_STEPS = [0, 0.08, -0.08, 0.14, -0.06];

function combosFor(poolSize: number, count: number): { pitch: number; rate: number }[] {
  for (let rates = 1; rates <= RATE_STEPS.length; rates++) {
    for (let pitches = 1; pitches <= PITCH_STEPS.length; pitches++) {
      if (poolSize * pitches * rates >= count) {
        const out: { pitch: number; rate: number }[] = [];
        for (let r = 0; r < rates; r++) {
          for (let p = 0; p < pitches; p++) out.push({ pitch: PITCH_STEPS[p]!, rate: RATE_STEPS[r]! });
        }
        return out;
      }
    }
  }
  throw new Error(`edge cast: ${count} characters and only ${poolSize} voices`);
}

function assign(ids: readonly string[], pool: readonly PoolVoice[]): Map<string, EdgeCastVoice> {
  const combos = combosFor(pool.length, ids.length);
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

const CAST: Record<VoiceLocale, Map<string, EdgeCastVoice>> = {
  yue: merge(assign(FEMALE_IDS, POOLS.yue.female), assign(MALE_IDS, POOLS.yue.male)),
  zh: merge(assign(FEMALE_IDS, POOLS.zh.female), assign(MALE_IDS, POOLS.zh.male)),
  ja: merge(assign(FEMALE_IDS, POOLS.ja.female), assign(MALE_IDS, POOLS.ja.male)),
  en: merge(assign(FEMALE_IDS, POOLS.en.female), assign(MALE_IDS, POOLS.en.male)),
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
